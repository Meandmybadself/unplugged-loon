let token;
// Function to get Spotify auth token.
const getSpotifyToken = async () => {
    const credentials = btoa(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`);

    const data = {
        grant_type: 'refresh_token',
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
    }

    const body = new URLSearchParams();
    Object.keys(data).forEach((prop) => {
        body.set(prop, data[prop]);
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        header: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body
    })

    const responseJSON = await response.json();
    return responseJSON.access_token;
}

// Make Spotify API request with authentication token.
const makeSpotifyRequest = async (url) => {

    if (!token) {
        token = await getSpotifyToken();
    }

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    return data;
}

// Fetch Power Loon playlist data.
const getPowerLoonPlaylist = async () => {
    console.info(`Fetching Power Loon playlist.`);
    const response = await fetch(process.env.POWERLOON_PLAYLIST_URL);
    const { data } = await response.json();
    if (data.code === 200 && data.response) {
        return data?.response;
    } else {
        console.error('Error fetching Power Loon playlist data.');
        console.error(data)
    }
}

const sync = async () => {
    const powerLoonPlaylist = await getPowerLoonPlaylist();
    console.info(`Found ${powerLoonPlaylist.length} songs in Power Loon playlist.`);

    console.info('Fetching Spotify playlist.')
    let spotifyPlaylist = await makeSpotifyRequest(
        `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}`);


    // console.log(JSON.stringify(spotifyPlaylist, null, 2));

    console.info(`Found ${spotifyPlaylist.items} songs in Spotify playlist ${process.env.SPOTIFY_PLAYLIST_ID}`);

    // Get the Spotfiy playlist and find the total number of entries.
    if (spotifyPlaylist.total > 100) {
        // Fetch the last page from the spotify playlist
        spotifyPlaylist = await makeSpotifyRequest(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=100&offset=${spotifyPlaylist.items.total - 1}`)
    }

    const items = spotifyPlaylist.tracks?.items || spotifyPlaylist.items;
    const latestTimestamp = items[items.length - 1].added_at;

    // Get all items from the Power Loon playlist that have a timestamp greater than latestTimestamp.
    // First, convert latestTimestamp to a unix epoch.
    const latestTimestampDate = (new Date(latestTimestamp)).getTime() / 1000;

    // Capture Power Loon items that are greater than latestTimestamp.
    const powerLoonItems = powerLoonPlaylist.filter(item => Number(item.timestamp) > latestTimestampDate).map(item => ({ artist: item.data.artist, title: item.data.description }));

    const uris = await Promise.all(powerLoonItems.map(async item => powerLoon2SpotifyId(item.artist, item.title)));

    // Add to playlist.
    if (!token) {
        token = await getSpotifyToken();
    }

    if (uris.length) {
        console.log('Adding to playlist.')
        await fetch(`https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/tracks`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uris
            }),
        });
    }
}


const powerLoon2SpotifyId = async (artist, track) => {
    // Search for spotify track using artist and track.
    const response = await makeSpotifyRequest(`https://api.spotify.com/v1/search?q=artist:${artist}%20track:${track}&type=track&limit=1`)
    const { tracks } = response;
    if ((tracks?.items || []).length) {
        return `spotify:track:${tracks.items[0].id}`;
    }
}

sync()