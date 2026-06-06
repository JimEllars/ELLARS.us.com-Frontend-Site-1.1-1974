import json

payload = {
    "screenshot_path": "/home/jules/verification/screenshots/article_detail.png",
    "additional_media_paths": ["/home/jules/verification/videos/343c924003cc1177c2b60abe70f0cadf.webm"]
}

print(json.dumps(payload))
