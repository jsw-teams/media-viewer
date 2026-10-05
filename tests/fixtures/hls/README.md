# Generated playback fixture

Two local H.264/AAC VOD renditions, 64 seconds, generated from FFmpeg `testsrc` and `sine`. No production media or user data. The single-file playlists exercise init segments, byte ranges, automatic rendition switches and 2x playback. Included binary size is under 4 MB.

Regenerate from the project root using FFmpeg:

```sh
ffmpeg -hide_banner -loglevel error -y -f lavfi -i testsrc=size=320x180:rate=15 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 64 -map 0:v -map 1:a -map 0:v -map 1:a -c:v libx264 -preset ultrafast -pix_fmt yuv420p -g 60 -keyint_min 60 -sc_threshold 0 -b:v:0 100k -maxrate:v:0 100k -bufsize:v:0 200k -b:v:1 600k -maxrate:v:1 600k -bufsize:v:1 1200k -c:a aac -b:a 32k -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4 -hls_flags independent_segments+single_file -var_stream_map "v:0,a:0 v:1,a:1" -master_pl_name master.m3u8 -hls_segment_filename "tests/fixtures/hls/stream_%v.mp4" "tests/fixtures/hls/level_%v.m3u8"
```
