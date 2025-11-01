import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let originalText = '';
  
  try {
    const { text, targetLanguage } = await req.json();
    originalText = text || '';
    
    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    const googleApiKey = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    if (!googleApiKey) {
      console.warn('GOOGLE_TRANSLATE_API_KEY not configured, returning original text');
      return new Response(
        JSON.stringify({ translatedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base language code (e.g., 'en' from 'en-US')
    const targetLang = targetLanguage.split('-')[0].toLowerCase();

    // Retry logic for network errors
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // Call Google Translate API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const url = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            target: targetLang,
            format: 'text',
          }),
          signal: controller.signal,
        }).catch(fetchError => {
          // Catch connection errors at fetch level
          clearTimeout(timeoutId);
          throw fetchError;
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error');
          console.error(`Google Translate API error (attempt ${attempt}):`, response.status, errorText);
          throw new Error(`Google Translate API error: ${response.statusText}`);
        }

        const data = await response.json().catch(() => ({ data: { translations: [{ translatedText: text }] } }));
        const translatedText = data.data?.translations?.[0]?.translatedText || text;

        return new Response(
          JSON.stringify({ translatedText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Google Translate attempt ${attempt} failed:`, lastError.message);
        
        // If not last attempt, wait before retry
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // All retries failed - return original text instead of error
    console.warn('Google Translate translation failed after retries, returning original text:', lastError?.message);
    return new Response(
      JSON.stringify({ translatedText: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Translation error:', error);
    // Always return original text on error instead of failing
    return new Response(
      JSON.stringify({ translatedText: originalText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
