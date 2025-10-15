import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || 'unknown';

    console.log('Detecting language for IP:', clientIp);

    // Use ipapi.co for geolocation (free tier allows 1000 requests/day)
    const geoResponse = await fetch(`https://ipapi.co/${clientIp}/json/`);
    
    if (!geoResponse.ok) {
      console.error('Geolocation API error:', geoResponse.status);
      return new Response(
        JSON.stringify({ language: 'en', country: 'US' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geoData = await geoResponse.json();
    const countryCode = geoData.country_code || 'IT';
    
    console.log('Detected country:', countryCode);

    // Map country codes to languages
    const countryToLanguage: Record<string, string> = {
      'IT': 'it',
      'US': 'en',
      'GB': 'en',
      'CA': 'en',
      'AU': 'en',
      'DE': 'de',
      'AT': 'de',
      'CH': 'de',
      'ES': 'es',
      'MX': 'es',
      'AR': 'es',
      'FR': 'fr',
      'BE': 'fr',
    };

    const language = countryToLanguage[countryCode] || 'en';

    return new Response(
      JSON.stringify({ language, country: countryCode }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error detecting language:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        language: 'en',
        country: 'US'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});