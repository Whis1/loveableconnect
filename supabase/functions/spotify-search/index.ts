import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
}

async function searchItunes(query: string): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .map((item: any): Track => ({
      id: `itunes:${item.trackId}`,
      name: item.trackName,
      artist: item.artistName,
      album: item.collectionName || '',
      image_url: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '300x300') : null,
      preview_url: item.previewUrl || null,
    }))
    .filter((t: Track) => t.name && t.artist && t.preview_url);
}

async function searchSpotify(query: string): Promise<Track[]> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) return [];
  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenResponse.ok) return [];
    const { access_token } = await tokenResponse.json();
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=25`,
      { headers: { 'Authorization': `Bearer ${access_token}` } }
    );
    if (!searchResponse.ok) return [];
    const searchData = await searchResponse.json();
    return (searchData.tracks?.items || [])
      .map((track: any): Track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        image_url: track.album.images[0]?.url || null,
        preview_url: track.preview_url,
      }))
      .filter((t: Track) => !!t.preview_url);
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { query } = await req.json();
    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ tracks: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    let tracks = await searchItunes(query);
    if (tracks.length === 0) {
      tracks = await searchSpotify(query);
    }
    return new Response(JSON.stringify({ tracks }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in spotify-search function:', error);
    return new Response(JSON.stringify({ tracks: [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
