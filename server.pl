#!/usr/bin/perl
use strict;
use warnings;
use HTTP::Daemon;
use HTTP::Status;
use File::Basename;
my $port = $ARGV[0] || 8080;
my $root = dirname(__FILE__);

my $d = HTTP::Daemon->new(
    LocalAddr => '127.0.0.1',
    LocalPort => $port,
    ReuseAddr => 1,
) or die "Cannot start server: $!";

my %mime = (
    html => 'text/html; charset=utf-8',
    js   => 'application/javascript',
    css  => 'text/css',
    json => 'application/json',
    png  => 'image/png',
    jpg  => 'image/jpeg',
    svg  => 'image/svg+xml',
    ico  => 'image/x-icon',
);

print "Server running at http://127.0.0.1:$port/\n";

while (my $c = $d->accept) {
    while (my $r = $c->get_request) {
        my $path = $r->uri->path;
        $path = '/index.html' if $path eq '/';
        $path =~ s|^/||;
        $path = "$root/$path";

        if (-f $path) {
            my ($ext) = $path =~ /\.(\w+)$/;
            my $ct = $mime{lc($ext) // ''} // 'application/octet-stream';
            open my $fh, '<:raw', $path or next;
            my $body = do { local $/; <$fh> };
            close $fh;
            my $res = HTTP::Response->new(200);
            $res->header('Content-Type' => $ct);
            $res->content($body);
            $c->send_response($res);
        } else {
            $c->send_error(RC_NOT_FOUND);
        }
    }
    $c->close;
}
