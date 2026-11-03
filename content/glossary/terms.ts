import type { Glossary } from '@/engine/content/schema';

// The term registry. Each term is named in the Why step of exactly one lesson; terms arrive
// with the lessons that name them.
export const glossary = {
  terms: [
    {
      id: 'magnetic-pole',
      name: 'magnetic pole',
      forms: [
        'magnetic poles',
        'north pole',
        'north poles',
        'south pole',
        'south poles',
        'pole',
        'poles',
      ],
      definition:
        'Either end of a magnet, where its push and pull are strongest. Every magnet has a north pole and a south pole.',
      note: 'Cut a magnet in half and each half has its own north and south pole: a pole never comes on its own. Magnets are often painted red at the north end and blue at the south.',
      related: ['attraction', 'repulsion'],
      introducedIn: 'what-magnets-do',
    },
    {
      id: 'attraction',
      name: 'attraction',
      forms: ['attract', 'attracts', 'attracted', 'magnetic attraction'],
      definition:
        'The pull between two unlike magnetic poles, a north and a south, drawing them together.',
      note: 'Attraction acts across a gap: the magnets start to move toward each other before they touch, and the pull grows quickly as they get closer.',
      related: ['repulsion', 'magnetic-pole'],
      introducedIn: 'what-magnets-do',
    },
    {
      id: 'repulsion',
      name: 'repulsion',
      forms: ['repel', 'repels', 'repelled', 'magnetic repulsion'],
      definition:
        'The push between two like magnetic poles, north and north or south and south, driving them apart.',
      note: 'Like attraction, repulsion acts across a gap and grows quickly as the poles get closer. Turn one magnet around and the push becomes a pull.',
      related: ['attraction', 'magnetic-pole'],
      introducedIn: 'what-magnets-do',
    },
    {
      id: 'ferromagnetic',
      name: 'ferromagnetic',
      forms: ['ferromagnetism', 'ferromagnetic material', 'ferromagnetic materials'],
      definition:
        'Describes materials such as iron, steel, nickel and cobalt that a magnet pulls strongly, because they become magnets themselves near one.',
      note: 'Most metals are not ferromagnetic: copper, aluminium, gold and brass are not pulled. A paper clip stuck to a magnet becomes a weak magnet itself, strong enough to hold a second clip.',
      related: ['magnetic-field', 'attraction'],
      introducedIn: 'the-invisible-field',
    },
    {
      id: 'magnetic-field',
      name: 'magnetic field',
      forms: ['magnetic fields', 'field', 'fields'],
      definition:
        'The space around a magnet where it pushes and pulls on other magnets and on iron and steel.',
      note: 'A field has a direction at every point: the way a compass needle would point there. It is strongest near the poles and fades quickly with distance.',
      related: ['field-lines', 'magnetic-pole', 'compass'],
      introducedIn: 'the-invisible-field',
    },
    {
      id: 'field-lines',
      name: 'field lines',
      forms: ['field line', 'magnetic field lines', 'magnetic field line'],
      definition:
        'Lines that show the shape of a magnetic field. They run from north pole to south pole and crowd where the field is strongest.',
      note: 'Field lines are a drawing, not real threads: the field fills all the space between them. Iron filings and compass needles both line up along them, and arrows on them point the way a compass needle would.',
      related: ['magnetic-field', 'compass'],
      introducedIn: 'the-invisible-field',
    },
    {
      id: 'compass',
      name: 'compass',
      forms: ['compasses', 'compass needle', 'compass needles'],
      definition:
        'A small magnet on a pivot, free to turn, that lines up with the magnetic field where it sits.',
      note: "The north end of the needle is usually painted red. Far from other magnets it lines up with Earth's magnetic field and points north, which is why it is used to find the way.",
      related: ['earths-magnetic-field', 'magnetic-field'],
      introducedIn: 'what-a-compass-is',
    },
    {
      id: 'earths-magnetic-field',
      name: "Earth's magnetic field",
      forms: ["Earth's field"],
      definition:
        'The magnetic field all around the Earth, made deep inside it. It runs roughly south to north across the surface, so compasses point north.',
      note: 'It is weak: a small magnet close by easily outpulls it, which is why a compass beside a magnet stops pointing north. The magnetic pole in the Arctic is, in magnet terms, a south pole: it pulls on the north end of every compass.',
      related: ['compass', 'magnetic-field'],
      introducedIn: 'what-a-compass-is',
    },
    {
      id: 'electric-current',
      name: 'electric current',
      forms: ['current', 'currents', 'electric currents'],
      definition:
        'A flow of electricity round a circuit. It is the same all the way round, and stops everywhere when the circuit is broken.',
      note: 'By convention, current is drawn leaving a battery at its positive end and coming back in at its negative end. How much flows is measured in amperes, in the Electricity module.',
      related: ['electric-circuit', 'conductor'],
      introducedIn: 'what-current-is',
    },
    {
      id: 'electric-circuit',
      name: 'electric circuit',
      forms: ['circuit', 'circuits', 'electric circuits'],
      definition:
        'A complete loop of conductors that current flows round, from one end of a battery or generator and back to the other.',
      note: 'A switch opens and closes the loop. Open it anywhere and the circuit is broken: no current flows in any part of it.',
      related: ['electric-current', 'conductor', 'insulator'],
      introducedIn: 'what-current-is',
    },
    {
      id: 'conductor',
      name: 'conductor',
      forms: ['conductors', 'electrical conductor'],
      definition:
        'A material that current flows through easily. Metals such as copper and aluminium are good conductors.',
      note: 'Copper is used for most wires because it conducts well and bends easily. Salty water conducts too, which is one reason electricity and wet hands are dangerous.',
      related: ['insulator', 'electric-current'],
      introducedIn: 'what-current-is',
    },
    {
      id: 'insulator',
      name: 'insulator',
      forms: ['insulators'],
      definition:
        'A material that current cannot flow through, such as plastic, rubber, glass or dry wood.',
      note: 'Wires are coated in an insulator so the current stays in the copper and cannot pass into anything, or anyone, touching the wire.',
      related: ['conductor', 'electric-circuit'],
      introducedIn: 'what-current-is',
    },
    {
      id: 'compass-deflection',
      name: 'compass deflection',
      forms: ['compass deflections'],
      definition:
        'A compass needle turning away from north because another magnetic field, such as the one round a wire, acts on it.',
      note: 'Ørsted saw exactly this: a compass needle beside a wire twitched when he switched the current on, the first sign that current makes a magnetic field. The stronger the other field, the further the needle turns.',
      related: ['compass', 'right-hand-rule'],
      introducedIn: 'current-makes-a-field',
    },
    {
      id: 'right-hand-rule',
      name: 'right-hand rule',
      forms: ['right hand rule'],
      definition:
        'Point your right thumb along the current; your fingers curl the way the magnetic field circles the wire.',
      note: "It works for a coil too: curl your right fingers the way the current goes round the turns, and your thumb points to the coil's north pole.",
      related: ['compass-deflection', 'magnetic-field', 'electric-current'],
      introducedIn: 'current-makes-a-field',
    },
    {
      id: 'coil',
      name: 'coil',
      forms: ['coils'],
      definition:
        "Wire wound in many turns. Current in a coil makes a magnetic field like a bar magnet's.",
      note: 'More turns, or more current, make its field stronger. Coils are at the heart of motors, generators and transformers.',
      related: ['solenoid', 'electromagnet'],
      introducedIn: 'coil-it',
    },
    {
      id: 'solenoid',
      name: 'solenoid',
      forms: ['solenoids'],
      definition:
        "A long coil of wire. Its field runs straight along the middle and loops round outside, like a bar magnet's.",
      note: 'The word also names devices built round one, such as the solenoid valves that open and shut water and gas pipes.',
      related: ['coil', 'iron-core'],
      introducedIn: 'coil-it',
    },
    {
      id: 'iron-core',
      name: 'iron core',
      forms: ['iron cores', 'core', 'cores'],
      definition:
        "A rod of soft iron inside a coil. It becomes a magnet itself and makes the coil's field far stronger.",
      note: 'Soft iron is used because it stops being a magnet as soon as the current stops. Hard steel would stay magnetized.',
      related: ['electromagnet', 'ferromagnetic'],
      introducedIn: 'coil-it',
    },
    {
      id: 'electromagnet',
      name: 'electromagnet',
      forms: ['electromagnets'],
      definition:
        'A coil, usually with an iron core, that is a magnet only while current flows through it.',
      note: 'Because it can be switched on and off, and made stronger with more current, an electromagnet does jobs a permanent magnet cannot: lifting scrap, locking doors, ringing bells.',
      related: ['coil', 'iron-core', 'solenoid'],
      introducedIn: 'coil-it',
    },
  ],
  confusablePairs: [],
} satisfies Glossary;
