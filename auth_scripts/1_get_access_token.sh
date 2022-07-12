#!/bin/bash

AUTH_TOKEN=`echo -n $SPOTIFY_CLIENT_ID:$SPOTIFY_CLIENT_SECRET | base64`

curl -X POST \
-d "code=$SPOTIFY_CLIENT_CODE" \
-d "redirect_uri=https://unplugged.local" \
-d grant_type=authorization_code \
-d "client_id=$SPOTIFY_CLIENT_ID" \
-d "client_secret=$SPOTIFY_CLIENT_SECRET" \
-u "$SPOTIFY_CLIENT_ID:$SPOTIFY_CLIENT_SECRET" \
https://accounts.spotify.com/api/token