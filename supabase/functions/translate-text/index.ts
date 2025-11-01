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
    const { text, targetLanguage } = await req.json();
    
    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    const deeplApiKey = Deno.env.get('DEEPL_API_KEY');
    if (!deeplApiKey) {
      throw new Error('DEEPL_API_KEY not configured');
    }

    // Map language codes to DeepL supported languages
    const languageMap: Record<string, string> = {
      'en': 'EN-US',
      'it': 'IT',
      'de': 'DE',
      'es': 'ES',
      'fr': 'FR',
    };

    const targetLang = languageMap[targetLanguage.toLowerCase()];
    
    // If language not supported by DeepL, return original text
    if (!targetLang) {
      console.log(`Language ${targetLanguage} not supported by DeepL, returning original text`);
      return new Response(
        JSON.stringify({ translatedText: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call DeepL API (free tier endpoint)
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepL API error:', response.status, errorText);
      throw new Error(`DeepL API error: ${response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.translations[0].text;

    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
