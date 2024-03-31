#!/bin/bash

open "https://accounts.spotify.com/authorize?response_type=code&client_id=$SPOTIFY_CLIENT_ID&scope=playlist-modify-private+playlist-modify-public&redirect_uri=https%3A%2F%2Ffart.local&state=1234"