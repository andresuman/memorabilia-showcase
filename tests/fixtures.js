/* Test data for the preview and the tests: a small collection with the same shape the server sends. The
   autographed items and the game-used items are made up; the teams, stadiums and players are invented too.
   No real photos. It covers the cases the pages handle: an object signed by several people, a signed item that
   is also a game-used item, a reference photo, square, portrait and landscape photos.
   Photo IDs say the photo's shape: "sq-…", "portrait-…" (3:4) or "land-…" (4:3); the mock server draws them. */
(function (root) {
  'use strict';
  const HERONS = 'Harbor City Herons', BREAKERS = 'Bay City Breakers';
  function sig(signer, team, date, how, extra) {
    return Object.assign({
      signer: signer, sport: team === HERONS ? 'Baseball' : 'Football', team: team, inscription: '', date: date, how: how,
      giftedBy: '', at: '', autoAuth: '', autoCert: '', instagram: '', notes: ''
    }, extra || {});
  }
  function item(id, type, model, photos, signatures, extra) {
    return Object.assign({ id: id, type: type, model: model, detail: '', usage: '', itemAuth: '', itemCert: '', price: null, photos: photos, signatures: signatures }, extra || {});
  }

  root.TEST_COLLECTION = {
    items: [
      item('AM-0001', 'Helmet', 'Speed', ['sq-1'], [sig('Sam Rivers', BREAKERS, '2023-07-23', 'In Person', { at: 'Team Store' })], { detail: 'Black' }),
      item('AM-0002', 'Batting Helmet', '', ['sq-2', 'portrait-1', 'land-1'], [
        sig('Al Stone', HERONS, '2023-08-21', 'In Person', { at: 'Card Show' }),
        sig('Ben Cole', HERONS, '2024-02-24', 'In Person', { at: 'Card Show' }),
        sig('Cal Dunn', HERONS, '2025-02-01', 'TTM')
      ], { usage: 'Team Issued', itemAuth: 'MLB', itemCert: 'JD000001' }),
      item('AM-0003', 'Figure', 'Series 25', ['portrait-2'], [sig('Sam Rivers', BREAKERS, '2024-12-06', 'In Person', { at: 'Sports Bar' })], { detail: 'Sealed' }),
      item('AM-0004', 'Baseball', '', [], [sig('Al Stone', HERONS, '2024-05-05', 'Purchased', {
        at: 'eBay', inscription: 'HOF 96', autoAuth: 'JSA', autoCert: 'AA00001',
        instagram: 'https://www.instagram.com/s/example',
        notes: 'A second post, https://www.instagram.com/p/example, shows the show.'
      })], { price: 38.75, usage: 'Game Used', itemAuth: 'MLB', itemCert: 'YP000001/ABC', video: { ref: 'vid-1~0', size: 5000000, pieces: 3 } }),
      item('AM-0005', 'Jersey', 'Custom', ['land-2'], [sig('Dee Park', HERONS, '2025-08-05', 'Gift', { giftedBy: 'A Friend' })], { price: 120 })
    ],
    links: {}
  };

  function gu(id, type, extra) {
    return Object.assign({ id: id, type: type, detail: '', season: '', usage: 'Game Used', sport: 'Baseball', team: HERONS, player: '', date: '', away: '', home: '', score: '', result: '',
      stadium: '', attended: false, inning: '', atBat: '', pitching: '', play: '', auth: '', cert: '', photoMatched: false, signed: [], bought: '', at: '', price: null,
      notes: '', photos: [], video: null, order: 0 }, extra || {});
  }
  root.TEST_GU = {
    items: [
      gu('GU-0001', 'Baseball', { date: '2025-06-15', season: '2025', away: 'Cedar Falls Falcons', home: HERONS, score: '2 - 11', result: 'W', stadium: 'Seaside Stadium',
        attended: true, inning: 'Bottom of 3rd', atBat: 'Leo Vance', pitching: 'Dario Fontaine', play: 'Ball', auth: 'MLB', cert: 'PX400589/SVZ', bought: '2025-06-15', at: 'Herons Authentics',
        video: { ref: 'vid-2~0', size: 1000, pieces: 1 }, order: 0 }),
      gu('GU-0002', 'Baseball', { date: '2023-06-02', season: '2023', away: HERONS, home: 'Golden Bay Gulls', score: '3 - 2', result: 'W', stadium: 'Bayview Park',
        atBat: 'Derek Moss', pitching: 'Tomas Ferreira', play: 'Grounds out.', auth: 'MLB', cert: 'YP000001/ABC', signed: ['AM-0004'], order: 1 }),
      gu('GU-0003', 'Gloves', { sport: 'Football', team: BREAKERS, player: 'Cole Barrett', date: '2025-09-14', season: '2025', away: 'Lake City Lumberjacks', home: BREAKERS, score: '17 - 41', result: 'W',
        stadium: 'Bayfront Stadium', attended: true, auth: 'Metabilia', cert: 'AB23462', photoMatched: true, bought: '2025-10-19', at: 'Metabilia', price: 15.97,
        photos: ['land-3'], order: 2 }),
      gu('GU-0004', 'Batting Helmet', { usage: 'Team Issued', player: 'Nate Coleman', auth: 'MLB', cert: 'JD000001', signed: ['AM-0002'], bought: '2021-08-29', at: 'Seaside Stadium', order: 3 }),
      gu('GU-0006', 'Pants', { usage: 'Team Issued', sport: 'Football', team: BREAKERS, detail: 'White', season: '2023', notes: 'Size 36.', order: 5 }),
      gu('GU-0005', 'Baseball', { date: '2020-08-05', season: '2020', away: HERONS, home: 'Coral Bay Cyclones', score: '1 - 2', result: 'L', stadium: 'Cyclone Park',
        auth: 'MLB', cert: 'VS000002', notes: 'Doubleheader, game 2.', order: 4 })
    ],
    checks: { orphans: [], copies: [], dupes: [], videos: [], badIds: [] },
    links: {}
  };
  // The Teams tab: every team's color (and league, stadium, former names).
  const team = function (name, league, stadium, color, former) { return { team: name, league: league, stadium: stadium || '', former: former || [], color: color }; };
  root.TEST_TEAMS = {
    teams: [
      team('Harbor City Herons', 'MLB', 'Seaside Stadium', '#E2560B'), team('Bay City Breakers', 'NFL', 'Bayfront Stadium', '#2E1F8A'),
      team('Harbor City Sailors', 'MLB', '', '#0B4A9C'), team('Cedar Falls Falcons', 'MLB', '', '#0B5398'), team('Golden Bay Gulls', 'MLB', 'Bayview Park', '#004C54'),
      team('Lake City Lumberjacks', 'NFL', '', '#F25C14'), team('Coral Bay Cyclones', 'MLB', 'Cyclone Park', '#0A86D0'), team('Northgate Knights', 'MLB', 'Knight Field', '#00385D', ['Northgate Nomads']),
      team('Maplewood Monarchs', 'NBA', '', '#CE1141'), team('Iron City Ironworks', 'MLB', 'Foundry Field', '#1F3A6B'),
      team('Sunset City Stingrays', 'Soccer', '', '#D52B1E'), team('River City Rovers', 'Soccer', '', '#0B7A3B'), team('MLB', '', '', '#0E2A5C')
    ],
    checks: { noColor: [] },
    links: {}
  };
})(typeof window !== 'undefined' ? window : globalThis);
