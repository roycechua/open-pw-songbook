import type { SongMeta } from './types'
import { parseChordPro } from './parse'

const ADONAI = `{title: Adonai}
{artist: Traditional / Sample Arrangement}
{key: G}

{start_of_intro}
[G]  [D/F#]  [Em]  [C]
{end_of_intro}

{start_of_verse}
[G]Adonai, I [D/F#]lift my voice to [Em]You
[C]Maker of the [G]heavens and the [D]earth
[G]Adonai, my [D/F#]heart will worship [Em]You
[C]For You alone are [D]worthy of my [G]praise
{end_of_verse}

{start_of_chorus}
[C]Holy, [G]holy is the [D]Lord God Al[Em]mighty
[C]Worthy, [G]worthy of our [D]praise
[C]Glory, [G]glory to the [D]King of all [Em]ages
[C]Adonai, we [D]lift Your name on [G]high
{end_of_chorus}

{start_of_verse}
[G]Adonai, Your [D/F#]mercy never [Em]fails
[C]Steadfast love that [G]follows all my [D]days
[G]Adonai, Your [D/F#]presence is my [Em]peace
[C]I will trust in [D]You and not be a[G]fraid
{end_of_verse}

{start_of_bridge}
[Em]Who is like You, [C]Lord, among the [G]gods?
[D]None can compare to [Em]You
[C]Mountains bow and [G]oceans roar Your [D]name
[C]Adonai, we [D]worship You
{end_of_bridge}
`

const AMAZING_GRACE = `{title: Amazing Grace}
{artist: John Newton}
{key: G}

{start_of_verse}
[G]Amazing [G/B]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
I [G]once was [G/B]lost, but [C]now am [G]found
Was [Em]blind, but [D]now I [G]see
{end_of_verse}

{start_of_verse}
'Twas [G]grace that [G/B]taught my [C]heart to [G]fear
And [G]grace my [Em]fears re[D]lieved
How [G]precious [G/B]did that [C]grace ap[G]pear
The [Em]hour I [D]first be[G]lieved
{end_of_verse}

{start_of_verse}
Through [G]many [G/B]dangers, [C]toils and [G]snares
I [G]have al[Em]ready [D]come
'Tis [G]grace hath [G/B]brought me [C]safe thus [G]far
And [Em]grace will [D]lead me [G]home
{end_of_verse}

{start_of_verse}
When [G]we've been [G/B]there ten [C]thousand [G]years
Bright [G]shining [Em]as the [D]sun
We've [G]no less [G/B]days to [C]sing God's [G]praise
Than [Em]when we'd [D]first be[G]gun
{end_of_verse}
`

const HOW_GREAT = `{title: How Great Thou Art}
{artist: Carl Boberg / Stuart K. Hine}
{key: A}

{start_of_verse}
O [A]Lord my God, when [D]I in awesome [A]wonder
Consider [A]all the [E]works Thy hands have [A]made
I [A]see the stars, I [D]hear the rolling [A]thunder
Thy power through[A]out the [E]universe dis[A]played
{end_of_verse}

{start_of_chorus}
Then sings my [A]soul, my [D]Savior God, to [A]Thee
How great Thou [E]art, how great Thou [A]art
Then sings my [A]soul, my [D]Savior God, to [A]Thee
How great Thou [A]art, how [E]great Thou [A]art
{end_of_chorus}

{start_of_verse}
When through the [A]woods and [D]forest glades I [A]wander
And hear the [A]birds sing [E]sweetly in the [A]trees
When I look [A]down from [D]lofty mountain [A]grandeur
And hear the [A]brook and [E]feel the gentle [A]breeze
{end_of_verse}
`

const BLESS_THE_LORD = `{title: Bless the Lord (10,000 Reasons)}
{artist: Matt Redman / Jonas Myrin (sample arrangement)}
{key: G}

{comment: Chorus}
{start_of_chorus}
Bless the [G]Lord, O my [D]soul, O my [Em]soul
[C]Worship His [G]holy [D]name
Sing like [Em]never be[C]fore, O my [G]soul
I'll [C]worship Your [D]holy [G]name
{end_of_chorus}

{start_of_verse}
The [G]sun comes [D]up, it's a [Em]new day [C]dawning
It's [G]time to [D]sing Your [Em]song a[C]gain
What[G]ever may [D]pass and what[Em]ever lies be[C]fore me
Let me be [G]singing when the [D]evening [G]comes
{end_of_verse}

{start_of_verse}
You're [G]rich in [D]love and You're [Em]slow to [C]anger
Your [G]name is [D]great and Your [Em]heart is [C]kind
For [G]all Your [D]goodness I will [Em]keep on [C]singing
Ten thousand [G]reasons for my [D]heart to [G]find
{end_of_verse}
`

const SIMPLE_GIFT = `{title: This Is My Father's World}
{artist: Maltbie D. Babcock}
{key: D}

{start_of_verse}
[D]This is my [A]Father's [Bm]world
And [G]to my [D]listening [A]ears
All [D]nature [A]sings, and [Bm]round me [G]rings
The [D]music [A]of the [D]spheres
{end_of_verse}

{start_of_verse}
[D]This is my [A]Father's [Bm]world
I [G]rest me [D]in the [A]thought
Of [D]rocks and [A]trees, of [Bm]skies and [G]seas
His [D]hand the [A]wonders [D]wrought
{end_of_verse}

{start_of_verse}
[D]This is my [A]Father's [Bm]world
The [G]birds their [D]carols [A]raise
The [D]morning [A]light, the [Bm]lily [G]white
Declare their [D]Maker's [A]praise
{end_of_verse}
`

export const SONGS: SongMeta[] = [
  {
    slug: 'adonai',
    title: 'Adonai',
    artist: 'Traditional / Sample Arrangement',
    originalKey: 'G',
    chordPro: ADONAI,
  },
  {
    slug: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'John Newton',
    originalKey: 'G',
    chordPro: AMAZING_GRACE,
  },
  {
    slug: 'how-great-thou-art',
    title: 'How Great Thou Art',
    artist: 'Carl Boberg / Stuart K. Hine',
    originalKey: 'A',
    chordPro: HOW_GREAT,
  },
  {
    slug: 'bless-the-lord',
    title: 'Bless the Lord (10,000 Reasons)',
    artist: 'Matt Redman / Jonas Myrin (sample)',
    originalKey: 'G',
    chordPro: BLESS_THE_LORD,
  },
  {
    slug: 'fathers-world',
    title: "This Is My Father's World",
    artist: 'Maltbie D. Babcock',
    originalKey: 'D',
    chordPro: SIMPLE_GIFT,
  },
]

export function listSongs(): SongMeta[] {
  return SONGS
}

export function getSongBySlug(slug: string): SongMeta | undefined {
  return SONGS.find((s) => s.slug === slug)
}

export function getParsedSong(slug: string) {
  const meta = getSongBySlug(slug)
  if (!meta) return null
  const parsed = parseChordPro(meta.chordPro)
  return {
    meta,
    parsed: {
      ...parsed,
      title: parsed.title || meta.title,
      artist: parsed.artist || meta.artist,
      key: parsed.key || meta.originalKey,
    },
  }
}
