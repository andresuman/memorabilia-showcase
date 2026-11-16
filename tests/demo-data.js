/* Demo data for the public sample page (docs/demo.html) and the template spreadsheet: the same shape the
   server sends (see tests/fixtures.js), but with REAL player and team names so collectors see a collection
   that reads like theirs. The games are real and verified (Ravens 41-17 vs Browns, Sep 14, 2025; Orioles
   vs Angels, Jun 14, 2025; Orioles vs Mets doubleheader game 2, Jul 10, 2025). The certificate numbers are
   made up (AB123456 and the like) and the items are examples, not real items for sale. The demo shows the real
   sample photos, logos and videos from tests/sample-assets.json (the same files the Drive sample folders hold):
   an item's photo is its own ID, a video's reference is the hologram of the ball it shows. Three items have no
   photo on purpose (AM-0006, GU-0004, GU-0006), so the page shows what an item without a photo looks like.
   The test data stays in tests/fixtures.js with invented names, so the tests never depend on this file. */
(function (root) {
  'use strict';
  const ORIOLES = 'Baltimore Orioles', RAVENS = 'Baltimore Ravens';
  function sig(signer, sport, team, date, how, extra) {
    return Object.assign({
      signer: signer, sport: sport, team: team, inscription: '', date: date, how: how,
      giftedBy: '', at: '', autoAuth: '', autoCert: '', instagram: '', notes: ''
    }, extra || {});
  }
  function item(id, type, model, photos, signatures, extra) {
    return Object.assign({ id: id, type: type, model: model, detail: '', usage: '', itemAuth: '', itemCert: '', price: null, photos: photos, signatures: signatures }, extra || {});
  }

  root.TEST_COLLECTION = {
    items: [
      item('AM-0001', 'Jersey', 'Custom', ['AM-0001'], [sig('Derrick Henry', 'Football', RAVENS, '2024-12-06', 'In Person', { at: 'Card Show' })], { detail: 'Purple' }),
      item('AM-0002', 'Baseball', '', ['AM-0002'], [sig('Jim Palmer', 'Baseball', ORIOLES, '2024-05-05', 'Purchased', {
        at: 'eBay', inscription: 'HOF 90', autoAuth: 'JSA', autoCert: 'GH345678',
        notes: 'Signed in blue ink on the sweet spot.'
      })], { price: 38.75, usage: 'Game Used', itemAuth: 'MLB', itemCert: 'CD000001', video: { ref: 'CD000001~0', size: 29445, pieces: 1 } }),
      item('AM-0003', 'Jersey', 'Custom', ['AM-0003'], [sig('Zay Flowers', 'Football', RAVENS, '2025-08-05', 'Gift', { giftedBy: 'John', instagram: 'https://www.instagram.com/p/example' })], { detail: 'White' }),
      item('AM-0004', 'Bat', 'C243', ['AM-0004'], [sig('Gunnar Henderson', 'Baseball', ORIOLES, '2024-08-10', 'In Person', { at: 'Card Show', notes: 'Game model bat.' })], { detail: 'Blonde' }),
      item('AM-0005', 'Mini Helmet', 'Speed', ['AM-0005'], [sig('Roquan Smith', 'Football', RAVENS, '2025-03-15', 'In Person', { at: 'Card Show' })], { detail: 'Black' }),
      item('AM-0006', 'Baseball', '', [], [sig('Tippy Martinez', 'Baseball', ORIOLES, '2024-06-15', 'TTM', { notes: 'TTM, received in 2 weeks.' })])
    ],
    missing: null,
    links: {}
  };

  function gu(id, type, extra) {
    return Object.assign({ id: id, type: type, detail: '', season: '', usage: 'Game Used', sport: 'Baseball', team: ORIOLES, player: '', date: '', away: '', home: '', score: '', result: '',
      stadium: '', attended: false, inning: '', atBat: '', pitching: '', play: '', auth: '', cert: '', photoMatched: false, signed: [], bought: '', at: '', price: null,
      notes: '', photos: [], video: null, order: 0 }, extra || {});
  }
  root.TEST_GU = {
    items: [
      gu('GU-0001', 'Baseball', { date: '2025-06-14', season: '2025', away: 'Los Angeles Angels', home: ORIOLES, score: '5 - 6', result: 'W', stadium: 'Oriole Park at Camden Yards',
        attended: true, inning: 'Top of 1st', atBat: 'Taylor Ward', pitching: 'Tomoyuki Sugano', play: 'Foul', auth: 'MLB', cert: 'AB123456', bought: '2025-06-14', at: 'Orioles Authentics', price: 35,
        notes: 'Balls: 1, Strikes: 1', photos: ['GU-0001'],
        video: { ref: 'AB123456~0', size: 27811, pieces: 1 }, order: 0 }),
      gu('GU-0002', 'Baseball', { date: '2025-06-14', season: '2025', away: 'Los Angeles Angels', home: ORIOLES, score: '5 - 6', result: 'W', stadium: 'Oriole Park at Camden Yards',
        inning: 'Bottom of 1st', atBat: 'Gunnar Henderson', pitching: 'Tyler Anderson', play: 'Grounds out.',
        auth: 'MLB', cert: 'CD000001', signed: ['AM-0002'], photos: ['GU-0002'], order: 1 }),
      gu('GU-0003', 'Gloves', { sport: 'Football', team: RAVENS, player: 'Roquan Smith', date: '2025-09-14', season: '2025', away: 'Cleveland Browns', home: RAVENS, score: '17 - 41', result: 'W',
        stadium: 'M&T Bank Stadium', attended: true, auth: 'Metabilia', cert: 'MB000001', photoMatched: true, bought: '2025-10-19', at: 'Metabilia', price: 15.97,
        photos: ['GU-0003'], order: 2 }),
      gu('GU-0004', 'Batting Helmet', { usage: 'Team Issued', player: 'Ryan Mountcastle', auth: 'MLB', cert: 'JD000001', bought: '2021-08-29', at: 'Orioles Authentics', order: 3 }),
      gu('GU-0006', 'Pants', { usage: 'Team Issued', sport: 'Football', team: RAVENS, detail: 'White', season: '2023', notes: 'Size 36.', order: 5 }),
      gu('GU-0005', 'Baseball', { date: '2025-07-10', season: '2025', away: 'New York Mets', home: ORIOLES, score: '3 - 7', result: 'W', stadium: 'Oriole Park at Camden Yards',
        inning: 'Bottom of 1st', atBat: 'Jordan Westburg', pitching: 'Brandon Waddell', play: 'Grounds out.',
        auth: 'MLB', cert: 'EF000002', notes: 'Doubleheader, game 2.', photos: ['GU-0005'], order: 4 })
    ],
    checks: { orphans: [], copies: [], dupes: [], videos: [], badIds: [] },
    missing: null,
    links: {}
  };
  // The Teams tab: all 32 NFL and 30 MLB teams, real colors (ESPN, 2026 season) and current stadiums
  // (Wikipedia current-stadium lists, Nov 2026). Former names are the well-known ones, so an old item
  // (say, a Cleveland Indians ball) still matches its team.
  const team = function (name, league, stadium, color, former) { return { team: name, league: league, stadium: stadium || '', former: former || [], color: color }; };
  root.TEST_TEAMS = {
    teams: [
      team('Arizona Cardinals', 'NFL', 'State Farm Stadium', '#a40227'),
      team('Arizona Diamondbacks', 'MLB', 'Chase Field', '#aa182c'),
      team('Athletics', 'MLB', 'Sutter Health Park', '#003831', ['Oakland Athletics']),
      team('Atlanta Braves', 'MLB', 'Truist Park', '#0c2340'),
      team('Atlanta Falcons', 'NFL', 'Mercedes-Benz Stadium', '#a71930'),
      team('Baltimore Orioles', 'MLB', 'Oriole Park at Camden Yards', '#df4601'),
      team('Baltimore Ravens', 'NFL', 'M&T Bank Stadium', '#29126f'),
      team('Boston Red Sox', 'MLB', 'Fenway Park', '#0d2b56'),
      team('Buffalo Bills', 'NFL', 'Highmark Stadium', '#00338d'),
      team('Carolina Panthers', 'NFL', 'Bank of America Stadium', '#0085ca'),
      team('Chicago Bears', 'NFL', 'Soldier Field', '#0b1c3a'),
      team('Chicago Cubs', 'MLB', 'Wrigley Field', '#0e3386'),
      team('Chicago White Sox', 'MLB', 'Rate Field', '#000000'),
      team('Cincinnati Bengals', 'NFL', 'Paycor Stadium', '#fb4f14'),
      team('Cincinnati Reds', 'MLB', 'Great American Ball Park', '#c6011f'),
      team('Cleveland Browns', 'NFL', 'Huntington Bank Field', '#472a08'),
      team('Cleveland Guardians', 'MLB', 'Progressive Field', '#002b5c', ['Cleveland Indians']),
      team('Colorado Rockies', 'MLB', 'Coors Field', '#33006f'),
      team('Dallas Cowboys', 'NFL', 'AT&T Stadium', '#002a5c'),
      team('Denver Broncos', 'NFL', 'Empower Field at Mile High', '#0a2343'),
      team('Detroit Lions', 'NFL', 'Ford Field', '#0076b6'),
      team('Detroit Tigers', 'MLB', 'Comerica Park', '#0a2240'),
      team('Green Bay Packers', 'NFL', 'Lambeau Field', '#204e32'),
      team('Houston Astros', 'MLB', 'Daikin Park', '#002d62'),
      team('Houston Texans', 'NFL', 'NRG Stadium', '#021018'),
      team('Indianapolis Colts', 'NFL', 'Lucas Oil Stadium', '#003b75', ['Baltimore Colts']),
      team('Jacksonville Jaguars', 'NFL', 'EverBank Stadium', '#007487'),
      team('Kansas City Chiefs', 'NFL', 'Arrowhead Stadium', '#e31837'),
      team('Kansas City Royals', 'MLB', 'Kauffman Stadium', '#004687'),
      team('Las Vegas Raiders', 'NFL', 'Allegiant Stadium', '#000000', ['Oakland Raiders']),
      team('Los Angeles Angels', 'MLB', 'Angel Stadium', '#ba0021', ['Anaheim Angels']),
      team('Los Angeles Chargers', 'NFL', 'SoFi Stadium', '#0080c6', ['San Diego Chargers']),
      team('Los Angeles Dodgers', 'MLB', 'Dodger Stadium', '#005a9c'),
      team('Los Angeles Rams', 'NFL', 'SoFi Stadium', '#003594', ['St. Louis Rams']),
      team('Miami Dolphins', 'NFL', 'Hard Rock Stadium', '#008e97'),
      team('Miami Marlins', 'MLB', 'LoanDepot Park', '#00a3e0', ['Florida Marlins']),
      team('Milwaukee Brewers', 'MLB', 'American Family Field', '#13294b'),
      team('Minnesota Twins', 'MLB', 'Target Field', '#031f40'),
      team('Minnesota Vikings', 'NFL', 'U.S. Bank Stadium', '#4f2683'),
      team('New England Patriots', 'NFL', 'Gillette Stadium', '#002a5c'),
      team('New Orleans Saints', 'NFL', 'Caesars Superdome', '#d3bc8d'),
      team('New York Giants', 'NFL', 'MetLife Stadium', '#003c7f'),
      team('New York Jets', 'NFL', 'MetLife Stadium', '#115740'),
      team('New York Mets', 'MLB', 'Citi Field', '#002d72'),
      team('New York Yankees', 'MLB', 'Yankee Stadium', '#132448'),
      team('Philadelphia Eagles', 'NFL', 'Lincoln Financial Field', '#06424d'),
      team('Philadelphia Phillies', 'MLB', 'Citizens Bank Park', '#e81828'),
      team('Pittsburgh Pirates', 'MLB', 'PNC Park', '#000000'),
      team('Pittsburgh Steelers', 'NFL', 'Acrisure Stadium', '#000000'),
      team('San Diego Padres', 'MLB', 'Petco Park', '#2f241d'),
      team('San Francisco 49ers', 'NFL', "Levi's Stadium", '#aa0000'),
      team('San Francisco Giants', 'MLB', 'Oracle Park', '#000000'),
      team('Seattle Mariners', 'MLB', 'T-Mobile Park', '#005c5c'),
      team('Seattle Seahawks', 'NFL', 'Lumen Field', '#002a5c'),
      team('St. Louis Cardinals', 'MLB', 'Busch Stadium', '#be0a14'),
      team('Tampa Bay Buccaneers', 'NFL', 'Raymond James Stadium', '#bd1c36'),
      team('Tampa Bay Rays', 'MLB', 'Tropicana Field', '#092c5c', ['Tampa Bay Devil Rays']),
      team('Tennessee Titans', 'NFL', 'Nissan Stadium', '#4495d2', ['Houston Oilers']),
      team('Texas Rangers', 'MLB', 'Globe Life Field', '#003278'),
      team('Toronto Blue Jays', 'MLB', 'Rogers Centre', '#134a8e'),
      team('Washington Commanders', 'NFL', 'Northwest Stadium', '#5a1414', ['Washington Redskins']),
      team('Washington Nationals', 'MLB', 'Nationals Park', '#ab0003', ['Montreal Expos'])
    ],
    checks: { noColor: [] },
    links: {}
  };
})(typeof window !== 'undefined' ? window : globalThis);
