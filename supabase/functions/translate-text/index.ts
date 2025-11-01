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

    const deeplApiKey = Deno.env.get('DEEPL_API_KEY');
    if (!deeplApiKey) {
      console.warn('DEEPL_API_KEY not configured, returning original text');
      return new Response(
        JSON.stringify({ translatedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map language codes to DeepL supported languages
    const languageMap: Record<string, string> = {
      'en': 'EN-US',
      'it': 'IT',
      'de': 'DE',
      'es': 'ES',
      'fr': 'FR',
    };

    const baseLang = targetLanguage.split('-')[0].toLowerCase();
    const targetLang = languageMap[baseLang];
    
    // If language not supported by DeepL, return original text
    if (!targetLang) {
      console.log(`Language ${targetLanguage} not supported by DeepL, returning original text`);
      return new Response(
        JSON.stringify({ translatedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retry logic for network errors with shorter timeout
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // Call DeepL API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('https://api-free.deepl.com/v2/translate', {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${deeplApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: [text],
            target_lang: targetLang,
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
          console.error(`DeepL API error (attempt ${attempt}):`, response.status, errorText);
          throw new Error(`DeepL API error: ${response.statusText}`);
        }

        const data = await response.json().catch(() => ({ translations: [{ text }] }));
        const translatedText = data.translations?.[0]?.text || text;

        return new Response(
          JSON.stringify({ translatedText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`DeepL attempt ${attempt} failed:`, lastError.message);
        
        // If not last attempt, wait before retry
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // All retries failed - return original text instead of error
    console.warn('DeepL translation failed after retries, returning original text:', lastError?.message);
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
