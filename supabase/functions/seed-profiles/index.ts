import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Profile {
  id: string;
  nickname: string;
  full_name: string;
  age: number;
  gender: string;
  sexual_orientation: string;
  relationship_status: string;
  looking_for: string[];
  bio: string;
  city: string;
  interests: string[];
  is_admin_profile: boolean;
}

const cities = [
  'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze',
  'Bari', 'Catania', 'Venezia', 'Verona', 'Messina', 'Padova', 'Trieste', 'Brescia',
  'Parma', 'Taranto', 'Modena', 'Reggio Calabria', 'Prato', 'Perugia', 'Livorno', 'Cagliari'
];

const interests = [
  'Viaggiare', 'Cinema', 'Musica', 'Sport', 'Lettura', 'Cucina', 'Arte', 'Fotografia',
  'Yoga', 'Fitness', 'Danza', 'Teatro', 'Gaming', 'Escursioni', 'Moda', 'Design',
  'Tecnologia', 'Natura', 'Animali', 'Vino', 'Caffè', 'Festival', 'Concerti', 'Meditazione'
];

const nicknames = [
  'Lunetta', 'SoleVivo', 'MareBlu', 'Stellina', 'FiammaNera', 'VentoLibero', 
  'AuroraRosa', 'NuvoleNere', 'CieloSereno', 'PioggiaLeggera', 'NeveCalda',
  'FioreDiLoto', 'RosaSelvatica', 'GiglioNero', 'OrcheaRara', 'MarghReale',
  'LupoSolitario', 'AquilaReale', 'LeoneCurioso', 'TigreCalma', 'PanteraRosa',
  'Sognatore', 'Viandante', 'Navigante', 'Esploratore', 'Avventuriero',
  'Artista', 'Musicista', 'Scrittore', 'Pensatore', 'Creativo',
  'Guerriero', 'Combattente', 'Ribelle', 'Libero', 'Indipendente',
  'Dolce', 'Gentile', 'Affettuoso', 'Premuroso', 'Caloroso',
  'Magico', 'Mistico', 'Spirito', 'Anima', 'Essenza',
  'Diamante', 'Rubino', 'Zaffiro', 'Smeraldo', 'Topazio'
];

const names = [
  // Nomi femminili
  'Alessia Rossi', 'Martina Bianchi', 'Giulia Ferrari', 'Francesca Romano', 'Chiara Colombo',
  'Sara Ricci', 'Valentina Marino', 'Elisa Greco', 'Laura Bruno', 'Silvia Gallo',
  'Anna Conti', 'Elena Rizzo', 'Sofia Costa', 'Giorgia Fontana', 'Federica Esposito',
  'Camilla Moretti', 'Beatrice De Luca', 'Veronica Villa', 'Monica Barbieri', 'Claudia Leone',
  
  // Nomi maschili
  'Marco Rossi', 'Andrea Bianchi', 'Luca Ferrari', 'Matteo Romano', 'Alessandro Colombo',
  'Davide Ricci', 'Simone Marino', 'Federico Greco', 'Lorenzo Bruno', 'Gabriele Gallo',
  'Riccardo Conti', 'Stefano Rizzo', 'Daniele Costa', 'Francesco Fontana', 'Paolo Esposito',
  'Giovanni Moretti', 'Antonio De Luca', 'Michele Villa', 'Roberto Barbieri', 'Tommaso Leone',
  
  // Nomi neutri/vari
  'Alex Marchetti', 'Sam Caruso', 'Morgan Ferrara', 'Jordan Santoro', 'Casey Vitale',
  'River Lombardi', 'Sky Coppola', 'Phoenix Mariani', 'Sage Rinaldi', 'Quinn Neri'
];

const bios = [
  'Amo perdermi nei tramonti e trovare me stesso nelle nuove avventure. La vita è troppo breve per non viverla intensamente.',
  'Sono un\'anima libera che ama esplorare il mondo, una città alla volta. Cerco qualcuno con cui condividere questi momenti.',
  'Appassionato di buon cibo, vino e conversazioni che durano fino all\'alba. La profondità mi affascina più della superficialità.',
  'Creativo per natura, sogno ad occhi aperti e realizzo i miei progetti con determinazione. Cerco chi sappia apprezzare l\'unicità.',
  'Lettore accanito e scrittore occasionale. Le parole sono la mia passione, la musica il mio rifugio.',
  'Sportivo ma anche intellettuale. Credo nell\'equilibrio tra corpo e mente. Lo yoga mi ha insegnato molto.',
  'Amante dell\'arte in tutte le sue forme. Dipingo emozioni e cerco chi sappia comprenderle senza spiegarle.',
  'Viaggiatore per vocazione, fotografo per passione. Catturo momenti e li trasformo in ricordi eterni.',
  'Musicista nel cuore, suono per esprimere ciò che le parole non possono dire. La vita è una melodia continua.',
  'Chef improvvisato ma entusiasta. Cucinare è il mio modo di mostrare affetto. Ti va un assaggio?',
  'Cinefilo incallito con una collezione di film d\'autore impressionante. Cerco qualcuno per maratone notturne.',
  'Architetto di professione, sognatore per natura. Vedo bellezza nelle linee e poesia nelle strutture.',
  'Amante degli animali, volontario al rifugio locale. I miei gatti sono la mia famiglia allargata.',
  'Filosofo della domenica, mi piacciono le domande senza risposta e le conversazioni che fanno pensare.',
  'Ballerino di salsa e bachata. Il ballo è libertà, espressione, connessione. Vuoi ballare con me?',
  'Appassionato di tecnologia ma con un\'anima vintage. Il futuro si costruisce rispettando il passato.',
  'Scrivo codice di giorno e poesie di notte. Sono un nerd romantico, esisto davvero!',
  'Amante della natura e dell\'escursionismo. La montagna è la mia terapia, il silenzio il mio maestro.',
  'Attivista per l\'ambiente e la giustizia sociale. Credo che ognuno possa fare la differenza.',
  'Gamer appassionato ma anche outdoor enthusiast. L\'equilibrio è tutto, anche nei videogiochi della vita.',
  'Insegnante che impara qualcosa di nuovo ogni giorno dai suoi studenti. La curiosità è la mia guida.',
  'Fotografo notturno, catturo la magia della città quando tutti dormono. La notte ha storie da raccontare.',
  'Collezionista di vinili e amante della musica vintage. Il passato suona meglio del presente.',
  'Artigiano del legno, creo con le mani ciò che immagino con la mente. La creatività non ha limiti.',
  'Praticante di arti marziali, ma sono una persona pacifica. La forza vera è nel controllo.',
  'Appassionato di astronomia, passo notti intere a guardare le stelle. L\'universo mi fa sentire piccolo e grande insieme.',
  'Barista di professione, artista del caffè. Ogni tazza è una tela, ogni cliente una storia.',
  'Giornalista freelance sempre in cerca della prossima storia da raccontare. La verità mi affascina.',
  'Designer grafico con un debole per l\'illustrazione. Trasformo idee in immagini che parlano.',
  'Biologo marino, passo più tempo sott\'acqua che sulla terraferma. L\'oceano è il mio mondo.',
  'Personal trainer che crede nel benessere olistico. Non solo muscoli, ma mente e spirito.',
  'Poeta urbano, scrivo versi sui muri della città. L\'arte deve essere per tutti, ovunque.',
  'Sommelier e appassionato enogastronomico. Ogni vino racconta una storia, ogni piatto un\'emozione.',
  'Psicologo con una passione per l\'arte terapia. Ascolto, capisco, supporto. Sono qui.',
  'Archeologo affascinato dal passato che ci insegna il futuro. Ogni reperto è una finestra temporale.',
  'DJ nei weekend, contabile in settimana. La musica è la mia valvola di sfogo.',
  'Volontario in una ONG, credo nel potere del dare. La felicità si moltiplica quando è condivisa.',
  'Appassionato di street art, la città è la mia galleria. Cerco bellezza anche nel grigio urbano.',
  'Climber che sfida i propri limiti una parete alla volta. La vetta è solo metà del viaggio.',
  'Floricultore che parla alle piante e le ascolta crescere. La natura ha il suo linguaggio.',
  'Attore di teatro indipendente, vivo per il palcoscenico. Ogni rappresentazione è un\'emozione unica.',
  'Tatuatore con il pallino per l\'arte tradizionale giapponese. Ogni tatuaggio è un\'opera d\'arte permanente.',
  'Produttore musicale che trasforma suoni in emozioni. La musica è la mia lingua madre.',
  'Restauratore d\'arte, riporto in vita capolavori dimenticati. Il passato merita rispetto e cura.',
  'Skateboard per passione, urbanista per vocazione. La città è il mio parco giochi.',
  'Cuoco vegano che sfida gli stereotipi del cibo vegetale. Gusto e etica possono convivere.',
  'Fotografo di matrimoni che cattura l\'amore nella sua forma più pura. Ogni coppia è unica.',
  'Libraio che consiglia libri come un sommelier fa col vino. Ogni lettore ha il suo libro perfetto.',
  'Guida turistica che conosce ogni angolo nascosto della città. Lasciati stupire dai segreti urbani.',
  'Cercatore di funghi e amante della natura selvaggia. La foresta è il mio supermercato preferito.'
];

const genders = [
  'male', 'male', 'male', 'male', 'male',
  'female', 'female', 'female', 'female', 'female',
  'transgender', 'transgender', 
  'transexual', 'transexual',
  'genderfluid', 'genderfluid',
  'non-binary', 'non-binary'
];

const orientations = [
  'heterosexual', 'heterosexual', 'heterosexual', 'heterosexual',
  'homosexual', 'homosexual', 'homosexual',
  'bisexual', 'bisexual', 'bisexual',
  'pansexual', 'pansexual',
  'asexual'
];

const relationshipStatuses = [
  'single', 'single', 'single', 'single',
  'in_relationship', 'divorced', 
  'prefer_not_say'
];

const lookingForOptions = [
  ['Relazione seria'],
  ['Relazione seria'],
  ['Incontri casuali'],
  ['Amicizia'],
  ['Non specifico'],
  ['Preferisco non dirlo']
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateProfiles(count: number): Profile[] {
  const profiles: Profile[] = [];
  const usedNicknames = new Set<string>();
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let nickname = getRandomElement(nicknames);
    let counter = 1;
    while (usedNicknames.has(nickname)) {
      nickname = getRandomElement(nicknames) + counter;
      counter++;
    }
    usedNicknames.add(nickname);

    let fullName = getRandomElement(names);
    while (usedNames.has(fullName)) {
      fullName = getRandomElement(names);
    }
    usedNames.add(fullName);

    profiles.push({
      id: crypto.randomUUID(),
      nickname,
      full_name: fullName,
      age: Math.floor(Math.random() * (55 - 18 + 1)) + 18,
      gender: getRandomElement(genders),
      sexual_orientation: getRandomElement(orientations),
      relationship_status: getRandomElement(relationshipStatuses),
      looking_for: getRandomElement(lookingForOptions),
      bio: getRandomElement(bios),
      city: getRandomElement(cities),
      interests: getRandomElements(interests, Math.floor(Math.random() * 6) + 3),
      is_admin_profile: true,
    });
  }

  return profiles;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Generating 50 profiles...');
    const profiles = generateProfiles(50);

    console.log('Inserting profiles into database...');
    const { data, error } = await supabase
      .from('profiles')
      .insert(profiles)
      .select();

    if (error) {
      console.error('Error inserting profiles:', error);
      throw error;
    }

    console.log(`Successfully inserted ${data.length} profiles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: data.length,
        message: `${data.length} profili creati con successo` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in seed-profiles function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});