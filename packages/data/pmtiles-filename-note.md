# PMTiles Filename Note (.gz suffix)

## Background

Due to a bug in how some CDNs (including the ones jsDelivr/github pages use) and brosers handle transparent compression of PMTiles files, range requests can fail or return incorrect content-length headers. This happens because:

1. CDNs may transparently compress files and return `Content-Encoding: gzip`
2. Firefox is more direct in asking for compressed data.
3. How the CDNs present the content-length header in the response and how the browsers handle it seem to be causing problems with range requests in PMTiles.

This issue appears consistently in Firefox and intermittently on Google Chrome while using pmtiles files from CDNs.

## Workaround

We ship the PMTiles file with a `.gz` suffix (`india_boundary_corrections.pmtiles.gz`) even though **it is not actually gzipped**. This tricks CDNs into not applying transparent compression, since they assume `.gz` files are already compressed. This was suggested in [PMTiles issue #584](https://github.com/protomaps/PMTiles/issues/584).

The original `.pmtiles` file is also kept for local development and direct usage scenarios where this issue doesn't occur and also to have a consistent fallback for when the issue is fixed.

## Files

- `india_boundary_corrections.pmtiles` - Original file (for local use)
- `india_boundary_corrections.pmtiles.gz` - Same file with .gz suffix (for CDN use)

## References

- [Issue in this repo](https://github.com/ramSeraph/india_boundary_corrector/issues/14)
- [PMTiles issue #584](https://github.com/protomaps/PMTiles/issues/584)
- [Firefox bug report](https://bugzilla.mozilla.org/show_bug.cgi?id=1874840)
