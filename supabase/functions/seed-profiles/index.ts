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
  bio: string;
  city: string;
  interests: string[];
  is_admin_profile: boolean;
}

const cities = [
  'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze',
  'Bari', 'Catania', 'Venezia', 'Verona', 'Messina', 'Padova', 'Trieste', 'Brescia'
];

const interests = [
  'Viaggiare', 'Cinema', 'Musica', 'Sport', 'Lettura', 'Cucina', 'Arte', 'Fotografia',
  'Yoga', 'Fitness', 'Danza', 'Teatro', 'Gaming', 'Escursioni', 'Moda', 'Design'
];

const nicknames = [
  'LunaNera', 'StellaRibelle', 'VenereRosa', 'AuroraWild', 'IrisLibera', 'GaiaSolare',
  'ZaraFiamma', 'NovaLuce', 'ElektraVibe', 'PhoenixRed', 'SkyeDream', 'VenusGlow',
  'AriaBlu', 'SofiaMoon', 'JadePearl', 'RubyFire', 'SapphireWave', 'EmeraldSky',
  'AmberSun', 'CrystalRain', 'DiamondStar', 'OpalNight', 'TopazGlow', 'PearlShine',
  'CoralSea', 'IvoryDream', 'GoldenHeart', 'SilverWings', 'BronzeSoul', 'PlatinumVibes',
  'VelvetMoon', 'SatinStar', 'SilkRose', 'LaceAngel', 'ChiffonDream', 'TulleFairy',
  'DenimRebel', 'LeatherQueen', 'CashmereChic', 'LinenBreeze', 'WoolWarm', 'CottonSoft',
  'MysticAura', 'WildSpirit', 'FreedomSoul', 'RebelHeart', 'BraveWoman', 'FierceOne',
  'GentleRose', 'SweetHoney', 'KindSoul', 'TenderHeart', 'WarmSmile', 'PureJoy'
];

const femaleNames = [
  'Alessia Rossi', 'Martina Bianchi', 'Giulia Ferrari', 'Francesca Romano', 'Chiara Colombo',
  'Sara Ricci', 'Valentina Marino', 'Elisa Greco', 'Laura Bruno', 'Silvia Gallo',
  'Anna Conti', 'Elena Rizzo', 'Sofia Costa', 'Giorgia Fontana', 'Federica Esposito',
  'Camilla Moretti', 'Beatrice De Luca', 'Veronica Villa', 'Monica Barbieri', 'Claudia Leone',
  'Roberta Marchetti', 'Simona Caruso', 'Daniela Ferrara', 'Cristina Santoro', 'Stefania Vitale',
  'Patrizia Lombardi', 'Manuela Coppola', 'Gabriella Mariani', 'Antonella Rinaldi', 'Ilaria Neri',
  'Jessica Parisi', 'Michela Mazza', 'Nicole Orlando', 'Serena De Santis', 'Diana Ferretti',
  'Vanessa Bellini', 'Rebecca Barone', 'Alessandra Vitali', 'Tiziana Benedetti', 'Paola Caputo',
  'Emanuela Grassi', 'Donatella Longo', 'Sabrina Martinelli', 'Lisa Valenti', 'Angela Farina',
  'Maria Rosa Guerra', 'Carla Rossetti', 'Eleonora De Rosa', 'Viviana Monti', 'Giada Silvestri'
];

const bios = [
  'Amo la vita e cerco qualcuno con cui condividerla. Appassionata di viaggi e nuove esperienze.',
  'Creativa, sognatrice e sempre in cerca di avventure. Mi piace vivere ogni momento intensamente.',
  'Amante della natura e degli animali. Cerco autenticità e connessioni vere.',
  'Sono una persona solare che ama ridere e godersi la vita. Adoro cucinare e scoprire nuovi sapori.',
  'Appassionata di arte e cultura. Mi piace perdermi nei musei e nei concerti live.',
  'Sportiva e dinamica, amo mantenermi in forma e vivere all\'aria aperta.',
  'Bookworm incallita, sempre con un libro in mano. Cerco qualcuno con cui condividere passioni letterarie.',
  'Libera pensatrice, indipendente ma romantica. Mi piace chi sa sorprendermi.',
  'Amante della musica, vado pazza per i concerti e i festival. La vita è troppo breve per la noia!',
  'Yogini e meditazione sono il mio mantra. Cerco equilibrio e serenità in ogni cosa.',
  'Fashion addicted e amante dello shopping. Ma sono anche una persona profonda, fidati!',
  'Cinefila sfegatata, potrei parlare di film per ore. Cerco qualcuno per maratone cinematografiche.',
  'Amante della fotografia, catturo momenti e emozioni. Il mondo è pieno di bellezza.',
  'Foodie convinta, sempre alla ricerca del ristorante perfetto. Amo condividere buon cibo e risate.',
  'Viaggiatrice instancabile, ho visto 30 paesi e ne voglio vedere altri 100!',
  'Ballerina nel cuore, la danza è la mia forma di espressione. Cerco ritmo e passione.',
  'Gamer girl orgogliosa! Sì, esistiamo davvero. Cerco player 2 per la vita.',
  'Appassionata di teatro e spettacoli. L\'arte è vita, la vita è arte.',
  'Fitness enthusiast, ma amo anche rilassarmi con un buon vino. Equilibrio è la chiave!',
  'Designer di giorno, artista di notte. Cerco ispirazione in ogni angolo del mondo.',
  'Amante degli animali, ho due gatti adorabili. Se non li ami, swipe left!',
  'Avventuriera urbana, esploro la mia città come fosse un continente sconosciuto.',
  'Poetessa dell\'anima, scrivo quello che sento. Cerco qualcuno che capisca le mie parole.',
  'Appassionata di cucina vegana, ma rispetto tutte le scelte alimentari. Amore e rispetto!',
  'Imprenditrice ambiziosa ma con i piedi per terra. Cerco qualcuno che supporti i miei sogni.',
  'Amante del mare, potrei vivere in spiaggia. Il suono delle onde è la mia colonna sonora.',
  'Nerd orgogliosa, amo scienza e tecnologia. Ma sono anche romantica, promesso!',
  'Musicista appassionata, suono la chitarra e canto. La musica è il mio linguaggio universale.',
  'Attivista per i diritti e la giustizia sociale. Cerco qualcuno che condivida i miei valori.',
  'Amante del vintage e dello stile retrò. Tutto ciò che è vecchio è nuovo di nuovo!',
  'Esploratrice di montagna, amo le escursioni e i panorami mozzafiato.',
  'Architetta appassionata, vedo bellezza nelle linee e nelle forme. Il design è ovunque.',
  'Coffee lover, il mio giorno inizia con un buon espresso. Cerco qualcuno per coffee dates!',
  'Appassionata di psicologia, mi piace capire le persone. Sono una buona ascoltatrice.',
  'Amante della notte e delle stelle. Potrei passare ore a guardare il cielo.',
  'Cuoca provetta, amo sperimentare in cucina. Cerco qualcuno da coccolare con i miei piatti.',
  'Appassionata di lingue, parlo 4 idiomi. Il mondo è piccolo quando sai comunicare!',
  'Insegnante di professione, sognatrice per vocazione. Cerco qualcuno con cui crescere.',
  'Amante del fai-da-te, creo con le mie mani. La creatività non ha limiti!',
  'Volontaria nel tempo libero, credo nel dare agli altri. Il karma esiste!',
  'Appassionata di astronomia, l\'universo mi affascina. Siamo polvere di stelle!',
  'Artista poliedrica, mi esprimo in mille modi diversi. Cerco qualcuno che apprezzi la mia unicità.',
  'Amante del mistero e dei thriller. La vita è troppo prevedibile, cerco brividi!',
  'Filosofa nel cuore, mi piacciono le conversazioni profonde fino all\'alba.',
  'Appassionata di giardinaggio, curo le mie piante come fossero bambini.',
  'Amante del buon vino e della gastronomia. I piaceri della vita sono da condividere!',
  'Ballerina di salsa, amo il ritmo latino. Cerco qualcuno che sappia muoversi!',
  'Appassionata di storia e archeologia. Il passato mi insegna il futuro.',
  'Amante degli sport estremi, l\'adrenalina è la mia droga. Cerco qualcuno coraggioso!',
  'Scrittrice in erba, ho mille storie da raccontare. Tu ne vuoi far parte?'
];

const genders = ['female', 'female', 'female', 'female', 'female', 'female', 'female', 'female', 'female', 'female', 
                 'transexual', 'transgender', 'non-binary'];

const orientations = ['heterosexual', 'heterosexual', 'heterosexual', 'heterosexual', 
                      'homosexual', 'homosexual', 'bisexual', 'bisexual', 'pansexual'];

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
    while (usedNicknames.has(nickname)) {
      nickname = getRandomElement(nicknames) + Math.floor(Math.random() * 100);
    }
    usedNicknames.add(nickname);

    let fullName = getRandomElement(femaleNames);
    while (usedNames.has(fullName)) {
      fullName = getRandomElement(femaleNames);
    }
    usedNames.add(fullName);

    profiles.push({
      id: crypto.randomUUID(),
      nickname,
      full_name: fullName,
      age: Math.floor(Math.random() * (45 - 18 + 1)) + 18,
      gender: getRandomElement(genders),
      sexual_orientation: getRandomElement(orientations),
      bio: getRandomElement(bios),
      city: getRandomElement(cities),
      interests: getRandomElements(interests, Math.floor(Math.random() * 5) + 3),
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
