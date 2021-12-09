const MGE_PROPS_TEMPLATES = {
  UNEXPECTED_EVENT: {
    purpose: '<h2>Unexpected Random Event</h2>',
    tableSetting1: 'actionTable',
    tableSetting2: 'subjectTable'
  },
  INTERRUPTION_EVENT: {
    purpose: '<h2>Interruption Event</h2>',
    tableSetting1: 'actionTable',
    tableSetting2: 'subjectTable'
  },
  EVENT_QUESTION: {
    label: 'Random Event',
    placeholder: 'Reason',
    useFocusTable: true,
    tableSetting1: 'actionTable',
    tableSetting2: 'subjectTable'
  },
  EVENT_CHECK: {
    label: 'Event Check',
    placeholder: 'Reason',
    useFocusTable: true,
    tableSetting1: 'actionTable',
    tableSetting2: 'subjectTable'
  },
  COMPLEX_QUESTION: {
    label: 'Complex Question',
    placeholder: '???',
    useFocusTable: false,
    tableSetting1: 'actionTable',
    tableSetting2: 'subjectTable'
  },
  DESCRIPTION_QUESTION: {
    label: 'Detail Question',
    placeholder: 'Describe...',
    useFocusTable: false,
    tableSetting1: 'descriptionsAdvTable',
    tableSetting2: 'descriptionsAdjTable'
  },
  ACTION_QUESTION: {
    label: 'Action Question',
    placeholder: 'Does what...',
    useFocusTable: false,
    tableSetting1: 'actionTable',
    tableSetting2: 'subjectTable'
  }
}

function _mgeEnsureV2Chaos(windowTitle, macroCallback) {
  const isMinChaos = game.settings.get('mythic-gme-tools', 'minChaos') >= 3
  const isMaxChaos = game.settings.get('mythic-gme-tools', 'maxChaos') <= 6
  if (isMinChaos && isMaxChaos)
    return true
  else {
    let dialogue = new Dialog({
      title: windowTitle,
      content: `<div>This rule is based on Mythic Variations #2 Chaos Factor rules and needs Chaos Range settings between <b>3</b> and <b>6</b>.</div>
                <br>
                <div><b>Would you like me to change these settings for you?</b></div>
                <br>
                <div>Note: This can be configured in Module Settings.</div>`,
      buttons: {
        submit: {
          icon: '',
          label: 'Yes, Please',
          callback: async () => {
            await game.settings.set('mythic-gme-tools', 'minChaos', 3);
            await game.settings.set('mythic-gme-tools', 'maxChaos', 6);
            macroCallback();
          }
        },
        cancel: {
          icon: '',
          label: 'No, Thanks'
        }
      },
      default: "submit"
    });
    dialogue.render(true);
    return false;
  }
}

async function _mgeGetAllPacks() {
  const packsCore = await game.packs.get('mythic-gme-tools.mythic-gme-tables').getDocuments();
  const packsV1 = await game.packs.get('mythic-gme-tools.mythic-gme-v1-tables').getDocuments();
  const packsV2 = await game.packs.get('mythic-gme-tools.mythic-gme-v2-tables').getDocuments()
  return packsCore.concat(packsV1).concat(packsV2)
}

async function _mgeSimulateRoll(targetRoll) {
  const randomEventsIn3D = (targetRoll && game.dice3d && game.settings.get('mythic-gme-tools', 'randomEvents3DDelay') > 0);
  if (randomEventsIn3D) {
    await game.dice3d.showForRoll(targetRoll);
  }
  return targetRoll;
}

async function _mgeUpdateChatSimulation(baseChat, newMessage) {
  await baseChat.update({content: baseChat.data.content + newMessage});
  ui.chat.scrollBottom();
  const popOutChat = Object.values(ui.windows).find(w => w.constructor.name === 'ChatLog')
  if (popOutChat) {
    popOutChat.scrollBottom();
  }
  const randomEventsIn3D = (game.dice3d && game.settings.get('mythic-gme-tools', 'randomEvents3DDelay') > 0);
  if (randomEventsIn3D) {
    await new Promise(r => setTimeout(r, game.settings.get('mythic-gme-tools', 'randomEvents3DDelay')*1000));
  }
}

async function _mgeFindTableBySetting(setting) {
  const fallbackTables = await _mgeGetAllPacks();
  const name = game.settings.get('mythic-gme-tools', setting);
  const baseSetting = game.settings.settings.get(`mythic-gme-tools.${setting}`);
  return game.tables.contents.find(t => t.name === name) ??
    fallbackTables.find(t => t.name === name) ??
    fallbackTables.find(t => t.name === baseSetting.default);
}

async function _mgeFindTableByName(tableName) {
  return Object.values(
    game.tables.contents.concat((await _mgeGetAllPacks()))
  ).find(t => t.name === tableName);
}

function _mgeWaitFor3DDice(targetMessageId) {
  function buildHook(resolve) {
    Hooks.once('diceSoNiceRollComplete', (messageId) => {
      if (targetMessageId === messageId)
        resolve(true);
      else
        buildHook(resolve)
    });
  }
  return new Promise((resolve,reject) => {
    if(game.dice3d){
      buildHook(resolve);
    } else {
      resolve(true);
    }
  });
}

function _mgeGenerateChaosRankOptions() {
  const currentChaos = game.settings.get('mythic-gme-tools', 'currentChaos');
  const maxChaos = game.settings.get('mythic-gme-tools', 'maxChaos');
  const minChaos = game.settings.get('mythic-gme-tools', 'minChaos');
  let options = '';
  let i = 1;
  while (i <= maxChaos) {
    if (i >= minChaos)
      options += `<option value="${i}" ${currentChaos === i ? 'selected' : ''}>${i}</option>`;
    i++;
  }
  return options
}

Hooks.once('ready', async () => {

  const tables = Object.fromEntries((await _mgeGetAllPacks())
    .concat(game.tables.contents)
    .filter(e => e.name.startsWith('Mythic'))
    .map(e => [e.name, e.name]));

  const dieColors = {
    'red': 'Red',
    'green': 'Green',
    'blue': 'Blue',
    'purple': 'Purple',
    'black': 'Black',
    'acid': 'Acid',
    'air': 'Air',
    'cold': 'Cold',
    'earth': 'Earth',
    'fire': 'Fire',
    'force': 'Force',
    'ice': 'Ice',
    'lightning': 'Lightning',
    'necrotic': 'Necrotic',
    'poison': 'Poison',
    'psychic': 'Psychic',
    'radiant': 'Radiant',
    'thunder': 'Thunder',
    'water': 'Water'
  }

  game.settings.register('mythic-gme-tools', 'currentChaos', {
    name: 'Chaos Rank',
    hint: 'Current Mythic GME Chaos Rank',
    scope: 'world',
    config: false,
    type: Number,
    default: 5
  });

  if (game.dice3d) {
    game.settings.register('mythic-gme-tools', 'randomEvents3DDelay', {
      name: 'Simulate Slow Dice Rolling',
      hint: 'Rolls Mythic questions slowly, showing the answers as the dice roll. Set to 0 to disable. Larger numbers make it even slower',
      scope: 'world',
      config: true,
      type: Number,
      default: 1,
      range: {
        min: 0,
        max: 10,
        step: 1
      }
    });
    game.settings.register('mythic-gme-tools', 'v2ChaosDieColor', {
      name: 'Color for Chaos 3D Die',
      hint: 'Customize the color of your Chaos Die (Dice so Nice!) for Variations #2 rolls',
      scope: 'world',
      config: true,
      type: String,
      default: 'cold',
      choices: dieColors
    });
  }

  game.settings.register('mythic-gme-tools', 'doublesIgnoreChaos', {
    name: 'Double Ignores Chaos Factor',
    hint: 'Whether to ignore CF and always hit a random event regardless',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('mythic-gme-tools', 'useD8ForSceneCheck', {
    name: 'Use D8 for Scene Alteration checks',
    hint: 'A special rule for Variations #2 changing scene alteration probabilities',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('mythic-gme-tools', 'minChaos', {
    name: 'Minimum Chaos Factor',
    hint: 'Minimum value for Chaos Factor. Cannot be smaller than 1 or larger than the Maximum Chaos value.',
    scope: 'world',
    config: true,
    type: Number,
    default: 1,
    range: {
      min: 1,
      max: 9,
      step: 1
    },
    onChange: (newMinChaos) => {
      if (newMinChaos >= game.settings.get('mythic-gme-tools', 'maxChaos')) {
        ui.notifications.error("Mythic GME Tools: Minimum Chaos Factor must be smaller than Maximum Chaos value. Settings restored to default.");
        game.settings.set('mythic-gme-tools', 'minChaos', 1);
        game.settings.set('mythic-gme-tools', 'maxChaos', 9);
        return false;
      }
      const currentChaos = game.settings.get('mythic-gme-tools', 'currentChaos')
      if (currentChaos < newMinChaos)
        game.settings.set('mythic-gme-tools', 'currentChaos', newMinChaos)
    }
  });

  game.settings.register('mythic-gme-tools', 'maxChaos', {
    name: 'Maximum Chaos Factor',
    hint: 'Maximum value for Chaos Factor. Maximum is 9 and may not be smaller than Minimum Chaos value.',
    scope: 'world',
    config: true,
    type: Number,
    default: 9,
    range: {
      min: 1,
      max: 9,
      step: 1
    },
    onChange: (newMaxChaos) => {
      if (newMaxChaos <= game.settings.get('mythic-gme-tools', 'minChaos')) {
        ui.notifications.error("Mythic GME Tools: Maximum Chaos Factor must be larger than Minimum Chaos value. Settings restored to default.");
        game.settings.set('mythic-gme-tools', 'minChaos', 1);
        game.settings.set('mythic-gme-tools', 'maxChaos', 9);
        return false;
      }
      const currentChaos = game.settings.get('mythic-gme-tools', 'currentChaos')
      if (currentChaos > newMaxChaos)
        game.settings.set('mythic-gme-tools', 'currentChaos', newMaxChaos)
    }
  });

  game.settings.register('mythic-gme-tools', 'focusTable', {
    name: 'Focus Table',
    hint: 'Table to use for Random Event focus. Only table names starting with Mythic are listed.',
    scope: 'world',
    config: true,
    type: String,
    choices: tables,
    default: "Mythic GME: Event Focus"
  });

  game.settings.register('mythic-gme-tools', 'actionTable', {
    name: 'Action Table',
    hint: 'Table to use for Mythic GME Random Event action meaning. Only table names starting with Mythic are listed.',
    scope: 'world',
    config: true,
    type: String,
    choices: tables,
    default: "Mythic GME: Action Meaning"
  });

  game.settings.register('mythic-gme-tools', 'subjectTable', {
    name: 'Subject Table',
    hint: 'Table to use for Mythic GME Random Event subject meaning. Only table names starting with Mythic are listed.',
    scope: 'world',
    config: true,
    type: String,
    choices: tables,
    default: "Mythic GME: Subject Meaning"
  });

  game.settings.register('mythic-gme-tools', 'descriptionsAdvTable', {
    name: 'Descriptions Adverbs Table',
    hint: 'Table to use for Mythic GME V2 Detail Check Descriptor 1 Meaning. Only table names starting with Mythic are listed.',
    scope: 'world',
    config: true,
    type: String,
    choices: tables,
    default: "Mythic GME: Descriptions 1"
  });

  game.settings.register('mythic-gme-tools', 'descriptionsAdjTable', {
    name: 'Descriptions Adjectives Table',
    hint: 'Table to use for Mythic GME V2 Detail Check Descriptor 2 Meaning. Only table names starting with Mythic are listed.',
    scope: 'world',
    config: true,
    type: String,
    choices: tables,
    default: "Mythic GME: Descriptions 2"
  });

  game.settings.register("mythic-gme-tools", "deckPath", {
    name: "Deck Path Location",
    hint: "Folder where you store you card decks. Relative to User Data directory, where 'worlds', 'modules' and 'systems' are.",
    scope: "world",
    config: true,
    type: String,
    default: "decks",
  });

});

function mgeIncreaseChaos() {
  const currentChaos = game.settings.get('mythic-gme-tools', 'currentChaos');
  const maxChaos = game.settings.get('mythic-gme-tools', 'maxChaos');
  const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
  if (currentChaos < maxChaos) {
    game.settings.set('mythic-gme-tools', 'currentChaos', currentChaos + 1);
    const chat = {
      content: `<h2>Chaos Increased to ${currentChaos + 1}</h2>`,
      whisper: whisper
    };
    $("#mgme_chaos").val(currentChaos + 1);
    ChatMessage.create(chat);
  } else {
    let chat = {
      content: `<h2>Chaos Maximum! (${currentChaos})</h2>`,
      whisper: whisper
    };
    ChatMessage.create(chat);
  }
}

function mgeDecreaseChaos() {
  const currentChaos = game.settings.get('mythic-gme-tools', 'currentChaos');
  const minChaos = game.settings.get('mythic-gme-tools', 'minChaos');
  const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
  if (currentChaos > minChaos) {
    game.settings.set('mythic-gme-tools', 'currentChaos', currentChaos - 1);
    let chat = {
      content: `<h2>Chaos Decreased to ${currentChaos - 1}</h2>`,
      whisper: whisper
    };
    $("#mgme_chaos").val(currentChaos - 1);
    ChatMessage.create(chat);
  } else {
    let chat = {
      content: `<h2>Chaos Minimum! (${currentChaos})</h2>`,
      whisper: whisper
    };
    ChatMessage.create(chat);
  }
}

function mgeCheckChaos() {
  const currentChaos = game.settings.get('mythic-gme-tools', 'currentChaos');
  const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
  let chat = {
    content: `<h2>Chaos Rank (${currentChaos})</h2>`,
    whisper: whisper
  };
  ChatMessage.create(chat);
}

function mgeFateChart() {
  const fateChartDialog = `
    <form>
    <label for="odds">Odds:</label>
    <select name="odds" id="mgme_odds" style="margin-bottom: 10px;">
      <option value="i">Impossible</option>
      <option value="nw">No way</option>
      <option value="vu">Very unlikely</option>
      <option value="u">Unlikely</option>
      <option value="ff" selected>50/50</option>
      <option value="sl">Somewhat likely</option>
      <option value="l">Likely</option>
      <option value="vl">Very likely</option>
      <option value="nst">Near sure thing</option>
      <option value="ast">A sure thing</option>
      <option value="htb">Has to be</option>
    </select>
    <label for="chaos" style="margin-left: 5px;">Chaos Rank:</label>
    <select name="chaos" id="mgme_chaos" style="margin-bottom: 10px;">
    ${_mgeGenerateChaosRankOptions()}
    </select><br>
    <label for="question">Question (optional):</label>
    <input id="mgme_question" style="margin-bottom:10px;width: 260px;" placeholder="Ask the Oracle..."/>
    </form>
    `

  const odds_id_map = {
    'i': 'Impossible',
    'nw': 'No way',
    'vu': 'Very unlikely',
    'u': 'Unlikely',
    'ff': '50/50',
    'sl': 'Somewhat likely',
    'l': 'Likely',
    'vl': 'Very likely',
    'nst': 'Near sure thing',
    'ast': 'A sure thing',
    'htb': 'Has to be'
  }

  const chart = {
    'i': {
      '9': 50,
      '8': 25,
      '7': 15,
      '6': 10,
      '5': 5,
      '4': 5,
      '3': 0,
      '2': 0,
      '1': -20
    },
    'nw': {
      '9': 75,
      '8': 50,
      '7': 35,
      '6': 25,
      '5': 15,
      '4': 10,
      '3': 5,
      '2': 5,
      '1': 0
    },
    'vu': {
      '9': 85,
      '8': 65,
      '7': 50,
      '6': 45,
      '5': 25,
      '4': 15,
      '3': 10,
      '2': 5,
      '1': 5
    },
    'u': {
      '9': 90,
      '8': 75,
      '7': 55,
      '6': 50,
      '5': 35,
      '4': 20,
      '3': 15,
      '2': 10,
      '1': 5
    },
    'ff': {
      '9': 95,
      '8': 85,
      '7': 75,
      '6': 65,
      '5': 50,
      '4': 35,
      '3': 25,
      '2': 15,
      '1': 10
    },
    'sl': {
      '9': 95,
      '8': 90,
      '7': 85,
      '6': 80,
      '5': 65,
      '4': 50,
      '3': 45,
      '2': 25,
      '1': 20
    },
    'l': {
      '9': 100,
      '8': 95,
      '7': 90,
      '6': 85,
      '5': 75,
      '4': 55,
      '3': 50,
      '2': 35,
      '1': 25
    },
    'vl': {
      '9': 105,
      '8': 95,
      '7': 95,
      '6': 90,
      '5': 85,
      '4': 75,
      '3': 65,
      '2': 50,
      '1': 45
    },
    'nst': {
      '9': 115,
      '8': 100,
      '7': 95,
      '6': 95,
      '5': 90,
      '4': 80,
      '3': 75,
      '2': 55,
      '1': 50
    },
    'ast': {
      '9': 125,
      '8': 110,
      '7': 95,
      '6': 95,
      '5': 90,
      '4': 85,
      '3': 80,
      '2': 65,
      '1': 55
    },
    'htb': {
      '9': 145,
      '8': 130,
      '7': 100,
      '6': 100,
      '5': 95,
      '4': 95,
      '3': 90,
      '2': 85,
      '1': 80
    }
  }

  function generateOutput(odds, chaos, result) {
    const target = chart[odds][chaos];
    const ex_yes_bound = target * 0.2;
    const ex_no_bound = 100 - ((100 - target) * 0.2)
    let outcome = 'Yes!';
    let color = 'green';
    if (result <= ex_yes_bound) {
      color = 'lightseagreen';
      outcome = 'Exceptional Yes!';
    } else if (result > ex_no_bound) {
      color = 'red';
      outcome = 'Exceptional No!';
    } else if (result > target) {
      color = 'darkred';
      outcome = 'No!';
    }
    return `
  <div><b>Roll:</b> ${result} at <em>${odds_id_map[odds]}</em> with Chaos Rank[${chaos}]</div>
  <b style="color: ${color}">${outcome}</b>
  `
  }

  let dialogue = new Dialog({
    title: `Fate Chart`,
    content: fateChartDialog,
    render: html => html[0].getElementsByTagName("input").mgme_question.focus(),
    buttons: {
      submit: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: async (html) => {
          const question = html.find("#mgme_question").val() === '' ? "Fate Chart Question" : `<h2><b>${html.find("#mgme_question").val()}</b></h2>`;
          const odds = html.find("#mgme_odds").val();
          const chaos = html.find("#mgme_chaos").val();
          const roll = new Roll(`1d100`);
          const result = roll.evaluate({async: false}).total;
          let content = generateOutput(odds, chaos, result);
          let doubles = false;
          if (result > 10 && result < 100) {
            const s = result.toString();
            const ignoreDoubles = game.settings.get("mythic-gme-tools", "doublesIgnoreChaos");
            if (s[0] === s[1] && (ignoreDoubles || s[0] <= parseInt(chaos))) {
              content += `<div><b>Doubles!</b></div>`
              doubles = true;
            }
          }
          await roll.toMessage({
            flavor: question,
            content: content,
            speaker: ChatMessage.getSpeaker()
          })
          if (doubles) {
            if (game.dice3d)
              Hooks.once('diceSoNiceRollComplete', () => _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.UNEXPECTED_EVENT))
            else
              await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.UNEXPECTED_EVENT);
          }
        }
      }
    },
    default: "submit"
  })

  dialogue.render(true)
}

// Variations #2 Rule!
function mgeFateCheck() {
  if (!_mgeEnsureV2Chaos('Fate Check', mgeFateCheck))
    return;
  const currentChaosFactor = game.settings.get('mythic-gme-tools', 'currentChaos')
  const fateCheckDialog = `
    <form>
    <label for="odds">Odds:</label>
    <select name="odds" id="mgme_v2_odds" style="margin-bottom: 10px;">
      <option value="imp">Impossible</option>
      <option value="nw">No way</option>
      <option value="vu">Very unlikely</option>
      <option value="u">Unlikely</option>
      <option value="ff" selected>50/50</option>
      <option value="l">Likely</option>
      <option value="vl">Very likely</option>
      <option value="st">Sure thing</option>
      <option value="htb">Has to be</option>
    </select>
    <label for="chaos" style="margin-left: 5px;">Chaos Factor:</label>
    <select name="chaos" id="mgme_chaos" style="margin-bottom: 10px;">
        <option value="6" ${currentChaosFactor === 6 ? 'selected' : ''}>6</option>
        <option value="5" ${currentChaosFactor === 5 ? 'selected' : ''}>5</option>
        <option value="4" ${currentChaosFactor === 4 ? 'selected' : ''}>4</option>
        <option value="3" ${currentChaosFactor === 3 ? 'selected' : ''}>3</option>
    </select><br>
    <label for="question">Question (optional):</label>
    <input name="question" id="mgme_v2_question" style="margin-bottom:10px;width: 260px;" placeholder="Ask the Oracle..."/>
    <br>
    <input name="yesfav" type="checkbox" id="mgme_v2_yesfav">
    <label for="yesfav" style="vertical-align:super;">Yes is a favorable answer</label>
    </form>
    `

  const oddsMap = {
    'imp': {label: 'Impossible', mod: -8},
    'nw': {label: 'No way', mod: -6},
    'vu': {label: 'Very unlikely', mod: -4},
    'u': {label: 'Unlikely', mod: -2},
    'ff': {label: '50/50', mod: 0},
    'l': {label: 'Likely', mod: 2},
    'vl': {label: 'Very likely', mod: 4},
    'st': {label: 'Sure thing', mod: 6},
    'htb': {label: 'Has to be', mod: 8}
  }

  function generateOutput(oddsMod, chaosFactor, yesFavorable, fateTotal, fateDice1, fateDice2, chaosDie) {
    let outcome;
    let color;
    let randomEvent = false;
    const checkTotal = (
      fateTotal + oddsMod +
      (chaosFactor === 3 ? (yesFavorable ? 2 : -2) : 0) +
      (chaosFactor === 6 ? (yesFavorable ? -2 : 2) : 0)
    );
    const checkYes = checkTotal >= 11;
    if (checkYes) {
      outcome = 'Yes!';
      color = 'green';
    } else {
      outcome = 'No!';
      color = 'red';
    }
    if (chaosDie <= chaosFactor) {
      if (fateDice1 === fateDice2) { // both are the same - Exceptional + Random Event
        randomEvent = true;
        outcome = 'Exceptional ' + outcome + ' With Random Event';
        if (checkYes)
          color = 'blueviolet';
        else
          color = 'orangered';
      } else if (fateDice1 % 2 === 0 && fateDice2 % 2 === 0) { // both are even - Random Event
        randomEvent = true;
        outcome = outcome + ' With Random Event'
        if (checkYes)
          color = 'lightseagreen';
        else
          color = 'darkred';
      } else if (fateDice1 % 2 !== 0 && fateDice2 % 2 !== 0) { // both are odd - Exceptional
        outcome = 'Exceptional ' + outcome;
        if (checkYes)
          color = 'lightseagreen';
        else
          color = 'darkred';
      }
    }
    return {
      checkTotal: checkTotal,
      randomEvent: randomEvent,
      outcomeText: outcome,
      outcomeColor: color
    }
  }

  let dialogue = new Dialog({
    title: `Fate Check`,
    content: fateCheckDialog,
    render: html => html[0].getElementsByTagName("input").mgme_v2_question.focus(),
    buttons: {
      submit: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: async (html) => {
          const question = html.find("#mgme_v2_question").val() === '' ? "Fate Chart Question" : `<h2><b>${html.find("#mgme_v2_question").val()}</b></h2>`;
          const odds = html.find("#mgme_v2_odds").val();
          const chaosFactor = html.find("#mgme_chaos").val();
          const yesFavorable = html.find("#mgme_v2_yesfav").prop('checked');
          const roll = Roll.create('2d10 + 1d10[cold]').roll({async: false});
          const fateResult = roll.terms[0].total;
          const fateLeft = roll.terms[0].results[0].result;
          const fateRight = roll.terms[0].results[1].result;
          const chaosResult = roll.terms[2].total;
          let output = generateOutput(oddsMap[odds].mod, chaosFactor, yesFavorable, fateResult, fateLeft, fateRight, chaosResult);
          const content = `
          <div><b>Roll:</b> ${output.checkTotal} at <em>${oddsMap[odds].label}</em> with Chaos Factor[${chaosFactor}]</div>
          <b style="color: ${output.outcomeColor}">${output.outcomeText}</b>
          `;
          await roll.toMessage({
            flavor: question,
            content: content,
            speaker: ChatMessage.getSpeaker()
          })
          if (output.randomEvent) {
            if (game.dice3d)
              Hooks.once('diceSoNiceRollComplete', () => _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.UNEXPECTED_EVENT))
            else
              await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.UNEXPECTED_EVENT);
          }
        }
      }
    },
    default: "submit"
  })

  dialogue.render(true)
}

async function _mgeGetOracleAnswers(eventFocus, tableSetting1, tableSetting2) {
  let focusResult;
  let focusRoll;

  if (eventFocus)
    focusResult = eventFocus;
  else {
    const focusTable = await _mgeFindTableBySetting('focusTable');
    focusRoll = await focusTable.roll();
    focusResult = focusRoll.results[0].getChatText();
  }

  const descriptor1Table = await _mgeFindTableBySetting(tableSetting1);
  const descriptor1Roll = await descriptor1Table.roll();
  const descriptor1Result = descriptor1Roll.results[0].getChatText();

  const descriptor2Table = await _mgeFindTableBySetting(tableSetting2);
  const descriptor2Roll = await descriptor2Table.roll();
  const descriptor2Result = descriptor2Roll.results[0].getChatText();

  return {
    focusResult: focusResult,
    focusRoll: focusRoll,
    descriptor1Result: descriptor1Result,
    descriptor1Roll: descriptor1Roll,
    descriptor2Result: descriptor2Result,
    descriptor2Roll: descriptor2Roll
  };
}

async function _mgeSubmitOracleQuestion(eventTitle, useSpeaker, eventFocus, tableSetting1, tableSetting2) {
  const randomAnswers = await _mgeGetOracleAnswers(eventFocus, tableSetting1, tableSetting2);
  const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
  let chatConfig = {
    content: eventTitle,
    speaker: useSpeaker ? ChatMessage.getSpeaker() : undefined,
    whisper: whisper
  };
  let chatMessage = await ChatMessage.create(chatConfig);
  let oldHide;
  if (game.dice3d) {
    oldHide = game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide;
    game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = game.settings.get('mythic-gme-tools', 'randomEvents3DDelay')*1000*1.1;
  }
  if (randomAnswers.focusResult !== '_') // Special exception for non-focus based oracle questions
    await _mgeUpdateChatSimulation(chatMessage, `<div><b><u>${randomAnswers.focusResult}</u></b> (${(await _mgeSimulateRoll(randomAnswers.focusRoll?.roll))?.total ?? '*'})</div>`);
  await _mgeUpdateChatSimulation(chatMessage, `<div>${randomAnswers.descriptor1Result} (${(await _mgeSimulateRoll(randomAnswers.descriptor1Roll.roll)).total})</div>`);
  await _mgeUpdateChatSimulation(chatMessage, `<div>${randomAnswers.descriptor2Result} (${(await _mgeSimulateRoll(randomAnswers.descriptor2Roll.roll)).total})</div>`);
  if (game.dice3d && oldHide) {
    Hooks.once('diceSoNiceRollComplete', async () => {
      game.user.getFlag('dice-so-nice', 'settings').timeBeforeHide = oldHide;
    })
  }
}

async function _mgePrepareOracleQuestion(questionProps) {
  if (!questionProps.purpose) {
    const questionDialog = `
      <form>
      <label for="reQuestion">${questionProps.label} (optional):</label>
      <input name="reQuestion" id="mgme_re_question" style="margin-bottom: 10px" placeholder="${questionProps.placeholder}"/>
      ${questionProps.useFocusTable ? `
        <label for="reFocus" style="display:inline-block;">Event Focus:</label>
        <select name="reFocus" id="mgme_re_efocus" style="width:250px;margin-bottom: 10px;"></select>
      ` : ''}
      </form>
    `
    let dialogue = new Dialog({
      title: questionProps.label,
      content: questionDialog,
      render: async function (html) {
        if (questionProps.useFocusTable) {
          const eFocusElement = $("#mgme_re_efocus");
          const focusTableName = game.settings.get('mythic-gme-tools', 'focusTable');
          eFocusElement.append(`<option value="Random">${focusTableName}</option>`);
          const focusResults = (await _mgeFindTableByName(focusTableName)).results.contents.map(c => c.getChatText());
          focusResults.forEach(focus => {
            eFocusElement.append(`<option value="${focus}">${focus}</option>`);
          });
        }
        html[0].getElementsByTagName("input").mgme_re_question.focus();
      },
      buttons: {
        submit: {
          icon: '<i class="fas fa-comments"></i>',
          label: 'To Chat',
          callback: (html) => {
            let text = html[0].getElementsByTagName("input").mgme_re_question.value;
            const focusValue = $("#mgme_re_efocus");
            const eventFocus = focusValue.val() === 'Random' ? undefined : (focusValue.val() ?? '_');
            _mgeSubmitOracleQuestion(
              text.length ? `<h2>${text}</h2>` : `<h2>${questionProps.label}</h2>`,
              true,
              eventFocus,
              questionProps.tableSetting1,
              questionProps.tableSetting2
            );
          }
        }
      },
      default: "submit"
    })
    dialogue.render(true)
  } else {
    await _mgeSubmitOracleQuestion(
      questionProps.purpose,
      false,
      questionProps.focusValue,
      questionProps.tableSetting1,
      questionProps.tableSetting2
    );
  }
}

function mgeSceneAlteration() {
  const sceneAlterationDialogue = `
    <form>
    <label for="chaos" style="margin-left: 5px;">Chaos Rank:</label>
    <select name="chaos" id="mgme_chaos" style="margin-bottom: 10px;">
      ${_mgeGenerateChaosRankOptions()}
    </select>
    </form>
`

  let dialogue = new Dialog({
    title: `Scene Alteration Check`,
    content: sceneAlterationDialogue,
    buttons: {
      submit: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: async (html) => {
          const chaos = parseInt(html.find("#mgme_chaos").val());
          const useD8 = game.settings.get('mythic-gme-tools', 'useD8ForSceneCheck');
          const roll = new Roll(`${useD8 ? '1d8' : '1d10'}`);
          const result = roll.evaluate({async: false}).total;
          if (result <= chaos) {
            if (result % 2 === 0) {
              await roll.toMessage({
                content: `<b style="color: darkred">Scene was interrupted!</b> (${result})`
              });
              if (game.dice3d)
                Hooks.once('diceSoNiceRollComplete', () => _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.INTERRUPTION_EVENT))
              else
                await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.INTERRUPTION_EVENT);
            } else {
              return roll.toMessage({
                content: `<b style="color: darkred">Scene was altered!</b> (${result})`
              });
            }
          } else {
            return roll.toMessage({
              content: `<b style="color: darkgreen">Scene Proceeds Normally!</b> (${result})`
            });
          }
        }
      }
    },
    default: "submit"
  })

  dialogue.render(true)
}

async function mgeRandomEvent() {
  await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.EVENT_QUESTION);
}

async function mgeEventCheck() {
  await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.EVENT_CHECK);
}

async function mgeDetailDescriptionCheck() {
  await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.DESCRIPTION_QUESTION);
}

async function mgeDetailActionCheck() {
  await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.ACTION_QUESTION);
}

// Variations #1 Rule!
async function mgeComplexQuestion() {
  await _mgePrepareOracleQuestion(MGE_PROPS_TEMPLATES.COMPLEX_QUESTION)
}

async function mgeDealCard({
                             tableName,
                             fileExtension = 'jpg',
                             useRotate = false,
                             dialogTitle = 'Dealt Card',
                             height = '580px',
                             shuffle = true
                           }) {
  const projectRoot = game.settings.get("mythic-gme-tools", "deckPath");
  const fallbackTables = await _mgeGetAllPacks();
  const table = game.tables.find(t => t.name === tableName) ??
    fallbackTables.find(t => t.name === tableName)

  const result = await table.draw();
  if (shuffle && result.results.length === 0) {
    table.reset();
    ui.notifications.info("The Deck has been shuffled. Please draw again.");
    return false;
  }
  const image = await result.results[0].data.text;
  const isRotated = Math.random() < 0.5;
  const style = useRotate && isRotated ? " transform: rotate(181deg);" : "";

  const path = `${projectRoot}/${image}.${fileExtension}`

  try {
    await FilePicker.browse('user', path);
  } catch {
    let errorChat = {
      content: `
        <div style="color: red">ERROR: Cards not found. Make sure your cards are available in the following path:</div>
        <br>
        <div><em>${path}</em></div>
      `
    };
    ChatMessage.create(errorChat);
    return;
  }

  new Dialog({
    title: dialogTitle,
    content: `
      <div style="height: ${height};">
        <img
          style="border-radius: 5px; margin-bottom: 1em; ${style}"
          src="${path}"
        />
      <div>`,
    buttons: {
      reset: {
        label: "Shuffle Deck",
        callback: () => table.reset(),
      },
      close: {
        label: "Close",
        callback: () => {
        },
      },
    },
    default: "close"
  }).render(true);
}

function mgeFormattedChat() {
  const tokens = game.scenes.active.tokens.contents;

  const formattedChatDialog = `
    <form>
    <label for="mgme_format_style">Style:</label>
    <select id="mgme_format_style" style="margin-bottom: 10px;">
      <option value="title" selected>Title</option>
      <option value="subtitle">Subtitle</option>
      <option value="bold">Bold</option>
      <option value="italic">Italic</option>
      <option value="underline">Underline</option>
      <option value="normal">Normal</option>
    </select>
    <label for="mgme_format_speaker">Speaker:</label>
    <select id="mgme_format_speaker" style="margin-bottom: 10px;width:180px"></select>
    <label for="mgme_format_color" style="margin-bottom:10px;">Color:</label>
    <input id="mgme_format_color" style="margin-bottom:10px;width:60px;" placeholder="default"/>
    <label for="mgme_format_text">Message:</label>
    <input id="mgme_format_text" style="margin-bottom:10px;width: 200px;"/>
    </form>
    `

  let dialogue = new Dialog({
    title: `Formatted Text`,
    content: formattedChatDialog,
    render: html => {
      const curSpeaker = ChatMessage.getSpeaker();
      const speakerElement = $("#mgme_format_speaker");
      speakerElement.append(`<option value="Gamemaster">Gamemaster</option>`);
      tokens.forEach(token => {
        if (token.actor)
          speakerElement.append(`<option value=${token.actor.id} selected>${token.name}</option>`);
      });
      speakerElement.val(curSpeaker.actor ?? curSpeaker.alias);
      html[0].getElementsByTagName("input").mgme_format_text.focus()
    },
    buttons: {
      submit: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: () => {
          let message;
          let color = $("#mgme_format_color").val();
          if (color && color !== '') {
            color = `style="color:${color};"`;
          } else {
            `style="color:inherit;"`;
          }
          let text = $("#mgme_format_text").val();
          if (!text || text === '') return;
          switch ($("#mgme_format_style").val()) {
            case '':
            case 'normal':
            case undefined: {
              message = `<span ${color}>${text}</span>`;
              break;
            }
            case 'title': {
              message = `<h1 ${color}>${text}</h1>`;
              break;
            }
            case 'subtitle': {
              message = `<h2 ${color}>${text}</h2>`;
              break;
            }
            case 'bold': {
              message = `<b ${color}>${text}</b>`;
              break;
            }
            case 'italic': {
              message = `<em ${color}>${text}</em>`;
              break;
            }
            case 'underline': {
              message = `<u ${color}>${text}</u>`;
              break;
            }
          }

          const speakerElementVal = $("#mgme_format_speaker").val();
          const selectedSpeaker = speakerElementVal === 'Gamemaster' ? {alias: "Gamemaster"} : {actor: tokens.find(t => t.actor.id === speakerElementVal).actor.id};
          let chatConfig = {
            content: message,
            speaker: selectedSpeaker
          };
          ChatMessage.create(chatConfig);
        }
      }
    },
    default: "submit"
  })
  dialogue.render(true)
}

// Variations #2 Rule!
async function mgeDetailCheck() {
  if (!_mgeEnsureV2Chaos(`Detail Check`, mgeDetailCheck))
    return;

  const detailQuestionDialog = `
    <form>
    <label for="detailCheck">Question (optional):</label>
    <input name="detailCheck" id="mgme_v2_detail_check" style="margin-bottom:10px;width: 260px;" placeholder="Detail Question"/>
    <input name="includeDescriptionDetail" type="checkbox" id="mgme_v2_include_desc_detail">
    <label for="includeDescriptionDetail" style="vertical-align:super;">Include Description Detail</label>
    <input name="includeActionDetail" type="checkbox" id="mgme_v2_include_act_detail">
    <label for="includeActionDetail" style="vertical-align:super;">Include Action Detail</label>
    </form>
    `

  let dialogue = new Dialog({
    title: `Detail Check`,
    content: detailQuestionDialog,
    render: html => html[0].getElementsByTagName("input").mgme_v2_detail_check.focus(),
    buttons: {
      submit: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: async (html) => {
          const speaker = ChatMessage.getSpeaker();
          const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
          const currentChaos = game.settings.get('mythic-gme-tools', 'currentChaos');
          const detailCheckTable = await _mgeFindTableByName('Mythic GME: Detail Check');
          const detailCheckRoll = new Roll(`2d10 + ${currentChaos === 3 ? 2 : 0} + ${currentChaos === 6 ? -2 : 0}`);
          const detailCheckResult = (await detailCheckTable.draw({roll: detailCheckRoll, displayChat: false})).results[0].getChatText();
          const includeDescription = html.find("#mgme_v2_include_desc_detail").prop('checked');
          const includeAction = html.find("#mgme_v2_include_act_detail").prop('checked');
          let content = html.find("#mgme_v2_detail_check").val() === '' ? 'Detail Check' : `<h1><b>${html.find("#mgme_v2_detail_check").val()}</b></h1>`
          content += `<div><h2>${detailCheckResult}</h2></div>`;
          let chatConfig = {
            content: content,
            speaker: speaker,
            whisper: whisper
          };
          await ChatMessage.create(chatConfig);
          if (includeDescription) {
            await _mgePrepareOracleQuestion({
              purpose: '<h2>Description Detail Check</h2>',
              focusValue: detailCheckResult,
              tableSetting1: 'descriptionsAdvTable',
              tableSetting2: 'descriptionsAdjTable'
            });
          }
          if (includeAction) {
            await _mgePrepareOracleQuestion({
              purpose: '<h2>Action Detail Check</h2>',
              focusValue: detailCheckResult,
              tableSetting1: 'actionTable',
              tableSetting2: 'subjectTable'
            });
          }
        }
      }
    },
    default: "submit"
  })

  dialogue.render(true)
}

// Variations #1 Rule!
async function mgeBackstoryGenerator() {
  const selectedToken = canvas.tokens.controlled[0]?.name;

  const backstoryDialog = `
    <form>
    <div>
    <label for="backstoryCheck">Question (optional):</label>
    <select name="backstoryCheck" id="mgme_backstory_count" style="margin-bottom:10px;width:260px"">
        <option value="table" selected>Mythic GME: Backstory Events</option>
        <option value="1">One Backstory</option>
        <option value="2">Two Backstories</option>
        <option value="3">Three Backstories</option>
        <option value="4">Four Backstories</option>
        <option value="5">Five Backstories</option>
        <option value="6">Six Backstories</option>
        <option value="7">Seven Backstories</option>
    </select>
    </div>
    </form>
    `

  let dialogue = new Dialog({
    title: `Backstory Generator`,
    content: backstoryDialog,
    buttons: {
      submit: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: async (html) => {
          const speaker = ChatMessage.getSpeaker();
          let eventsCount;
          const choice = html.find("#mgme_backstory_count").val();
          if (choice === 'table') {
            const eventsCountTable = await _mgeFindTableByName('Mythic GME: Backstory Events');
            const backstoryDraw = await eventsCountTable.roll();
            eventsCount = parseInt(backstoryDraw.results[0].getChatText());
            let triggerMsg = await backstoryDraw.roll.toMessage({
              content: `<b>${eventsCount}</b> Backstory Events${speaker.alias === 'Gamemaster' ? '' : ` for <b>${speaker.alias}</b>`}`
            });
            await _mgeWaitFor3DDice(triggerMsg.id);
          } else {
            eventsCount = parseInt(choice);
            ChatMessage.create({
              content: `<b>${eventsCount}</b> Backstory Events${speaker.alias === 'Gamemaster' ? '' : ` for <b>${speaker.alias}</b>`}`
            })
          }
          const backstoryFocusTable = await _mgeFindTableByName('Mythic GME: Backstory Focus')
          const backstoryLabels = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'];
          let i = 0;
          while (i < eventsCount) {
            const backstoryFocus = (await backstoryFocusTable.roll()).results[0].getChatText();
            await _mgeSubmitOracleQuestion(
              `<h2>${backstoryLabels[i] ?? i+1} Backstory Event</h2>`,
              false,
              backstoryFocus,
              'actionTable',
              'subjectTable'
            )
            i++
          }
        }
      }
    },
    default: "submit"
  })

  dialogue.render(true)

}

function _mgeSaveActorBehaviorFromHTML(html, actor) {
  const elem = $(html);
  const actorBehavior = {
    theme: elem.find("#mgme_behavior_theme").val(),
    identity: elem.find("#mgme_behavior_identity").val(),
    identityMod: parseInt(elem.find("#mgme_behavior_identity_mod").val()),
    identityActive: elem.find("#mgme_behavior_identity_active").prop('checked'),
    personality: elem.find("#mgme_behavior_personality").val(),
    personalityMod: parseInt(elem.find("#mgme_behavior_personality_mod").val()),
    personalityActive: elem.find("#mgme_behavior_personality_active").prop('checked'),
    activity: elem.find("#mgme_behavior_activity").val(),
    activityMod: parseInt(elem.find("#mgme_behavior_activity_mod").val()),
    activityActive: elem.find("#mgme_behavior_activity_active").prop('checked'),
    dispositionRank: elem.find("#mgme_behavior_disposition").val(),
    dispositionValue: parseInt(elem.find("#mgme_behavior_disposition_value").val()),
  };
  const target = actor ?? canvas.tokens.controlled[0].actor;
  if (!target) {
    ui.notifications.warn("Mythic GME: No tokens selected!");
    return;
  }
  _mgeUpdateActorBehavior(target, actorBehavior);
  return actorBehavior;
}

async function _mgeFillRandomBehavior(elementId) {
  const descriptors = await _mgeGetOracleAnswers(
    'Behavior Personality',
    MGE_PROPS_TEMPLATES.DESCRIPTION_QUESTION.tableSetting1,
    MGE_PROPS_TEMPLATES.DESCRIPTION_QUESTION.tableSetting2
  )
  $(elementId).val(`${descriptors.descriptor1Result} ${descriptors.descriptor2Result}`);
}

async function _mgeFillRandomActivity(elementId) {
  const descriptors = await _mgeGetOracleAnswers(
    'Behavior Activity',
    MGE_PROPS_TEMPLATES.ACTION_QUESTION.tableSetting1,
    MGE_PROPS_TEMPLATES.ACTION_QUESTION.tableSetting2
  )
  $(elementId).val(`${descriptors.descriptor1Result} ${descriptors.descriptor2Result}`);
}

function _mgeParseNumberFromText(tableOutcome) {
  return parseInt(tableOutcome.match(/[-\d+]+/)[0]);
}

function _mgeUpdateActorBehavior(actor, behavior) {
  actor.setFlag('mythic-gme-tools', 'mgeBehavior', behavior)
}

async function _mgeFillRefreshDisposition(html) {
  const selectedToken = canvas.tokens.controlled[0];
  if (!selectedToken) {
    ui.notifications.warn("No Token selected!");
    return;
  }
  const behavior = selectedToken.actor.getFlag('mythic-gme-tools', 'mgeBehavior');
  if (!behavior)
    return;
  const baseDisposition = behavior.dispositionValue -
    (behavior.identityActive ? behavior.identityMod : 0) -
    (behavior.personalityActive ? behavior.personalityMod : 0) -
    (behavior.activityActive ? behavior.activityMod : 0);
  await _mgeFillRandomDisposition(html, baseDisposition);
  const newRank = $(html).find('#mgme_behavior_disposition').val();
  if (behavior.dispositionRank !== newRank)
    _mgeNotifyBehaviorRankShift(selectedToken.name, behavior.dispositionRank, newRank);
  _mgeSaveActorBehaviorFromHTML(html)
}

async function _mgeFillRandomDisposition(html, baseValue) {
  const element = $(html)
  let [mod1, mod2, mod3] = [
    element.find('#mgme_behavior_identity_active').prop('checked') ? element.find('#mgme_behavior_identity_mod').val() : 0,
    element.find('#mgme_behavior_personality_active').prop('checked') ? element.find('#mgme_behavior_personality_mod').val() : 0,
    element.find('#mgme_behavior_activity_active').prop('checked') ? element.find('#mgme_behavior_activity_mod').val() : 0
  ];
  const dispositionTable = await _mgeFindTableByName('Mythic GME: Behavior Check');
  const formula = `${baseValue ?? '2d10'} + ${mod1} + ${mod2} + ${mod3}`;
  const dispositionRoll = await new Roll(formula).roll({async:false});
  const dispositionResult = (await dispositionTable.draw({roll: dispositionRoll, displayChat: false})).results[0].getChatText();
  const dispositionTotal = dispositionRoll.total;
  element.find('#mgme_behavior_disposition').val(dispositionResult);
  element.find('#mgme_behavior_disposition_value').val(dispositionTotal);
  _mgeSaveActorBehaviorFromHTML(html);
}

function _mgeNotifyBehaviorRankShift(actorName, oldBehavior, newBehavior) {
  const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
  let chatBehavior = {
    content: `
            <div><h2>Disposition Shifted!</h2></div>
            <div><b>${actorName}</b> shifted from <em>${oldBehavior}</em> to <em>${newBehavior}</em></div>
            `,
    whisper: whisper
  };
  ChatMessage.create(chatBehavior);
}

async function _mgeAdjustDisposition(mod, actor) {
  const selectedToken = actor ?? canvas.tokens.controlled[0];
  if (!selectedToken) {
    ui.notifications.warn("Mythic GME: No tokens selected!");
    return;
  }
  const tableDispositions = await _mgeFindTableByName('Mythic GME: Behavior Check');
  const behavior = selectedToken.actor.getFlag('mythic-gme-tools', 'mgeBehavior');
  if (!behavior)
    return;
  behavior.dispositionValue += mod;
  const dispositionRankRoll = await tableDispositions.draw({roll: Roll.create(behavior.dispositionValue.toString()), displayChat: false});
  const newDispositionRank = dispositionRankRoll.results[0].getChatText();
  if (newDispositionRank !== behavior.dispositionRank) {
    _mgeNotifyBehaviorRankShift(selectedToken.name, behavior.dispositionRank, newDispositionRank);
  }
  behavior.dispositionRank = newDispositionRank;
  _mgeUpdateActorBehavior(selectedToken.actor, behavior);
  return behavior;
}

async function _mgeFillAdjustedDisposition(html, mod) {
  const newBehavior = await _mgeAdjustDisposition(parseInt(mod));
  if (!newBehavior)
    return;
  $(html).find("#mgme_behavior_disposition").val(newBehavior.dispositionRank);
  $(html).find("#mgme_behavior_disposition_value").val(newBehavior.dispositionValue);
  _mgeSaveActorBehaviorFromHTML(html);
}

async function _mgeBehaviorAction(actor, behavior) {
  const dispositionMod = _mgeParseNumberFromText(behavior.dispositionRank);
  console.log(dispositionMod);
  const tableOne = await _mgeFindTableByName('Mythic GME: NPC Action Table 1');
  const tableOneResult = (await tableOne.draw({displayChat: false})).results[0].getChatText();
  const tableOneMod = _mgeParseNumberFromText(tableOneResult);
  // This is tricky, NPC action does NOT shift disposition
  if (tableOneResult.includes('NPC Action')) {
    const tableTwo = await _mgeFindTableByName('Mythic GME: NPC Action Table 2');
    const tableTwoResult = (await tableTwo.draw({roll: new Roll(`2d10 + ${dispositionMod} + ${tableOneMod}`), displayChat: false})).results[0].getChatText();
    console.log(tableTwoResult);
    const messageContent = `
    <div><h1>${actor.name}</h1></div>
    <div>Performs an <b>unexpected</b> Action!</div>
    <div><b>Action:</b> ${tableTwoResult} (${dispositionMod})+(${tableOneMod})</div>
    `
    ChatMessage.create({content: messageContent});
  } else {
    await _mgeAdjustDisposition(tableOneMod, actor);
    const messageContent = `
    <div><h1>${actor.name}</h1></div>
    <div>${tableOneMod !== 0 ? `Disposition Shift: ${tableOneMod}` : 'No changes in disposition'}</div>
    <div>Performs an expected Action!</div>
    <div><b>Action:</b> ${tableOneResult}</div>
    `
    ChatMessage.create({content: messageContent});
  }
}

function mgeBehaviorCheck() {
  const selectedToken = canvas.tokens.controlled[0];

  if (!selectedToken) {
    ui.notifications.warn("Behavior Checks only work with a selected Token");
    return
  }

  const behaviorCheckDialog = `
    <form>
    <label for="behaviorName">Character:</label>
    <input disabled name="behaviorName" id="mgme_actor_name" style="margin-bottom: 10px;width:315px" value="${selectedToken.name}">
    <label for="behaviorTheme">Current Theme:</label>
    <input name="behaviorTheme" id="mgme_behavior_theme" onchange="_mgeSaveActorBehaviorFromHTML(this.parentElement.parentElement)" style="margin-bottom: 10px;width:285px" placeholder="Current Scene">

    <div>
    <label for="behaviorIdentity">Identity:</label>
    <input name="behaviorIdentity" id="mgme_behavior_identity" onchange="_mgeSaveActorBehaviorFromHTML(this.parentElement.parentElement)" style="margin-bottom:10px;width:168px;margin-left:21px;margin-right:20px;" required placeholder="Descriptor">
    <label for="behaviorIdentityMod">Mod:</label>
    <select name="behaviorIdentityMod" id="mgme_behavior_identity_mod" style="margin-bottom:10px;width:45px" onchange="_mgeFillRefreshDisposition(this.parentElement.parentElement)">
      <option value="-2">-2</option>
      <option value="0" selected>0</option>
      <option value="2">+2</option>
    </select>
    <input style="vertical-align:middle;" type="checkbox" id="mgme_behavior_identity_active" onchange="_mgeFillRefreshDisposition(this.parentElement.parentElement)">
    </div>

    <div>
    <label for="behaviorPersonality">Personality:</label>
    <input name="behaviorPersonality" id="mgme_behavior_personality" onchange="_mgeSaveActorBehaviorFromHTML(this.parentElement.parentElement)" style="margin-bottom:10px;width:168px" placeholder="Descriptor">
    <i style="width:auto;height:25px;" class="fas fa-dice" onclick="_mgeFillRandomBehavior('#mgme_behavior_personality')"></i>
    <label for="behaviorPersonalityMod">Mod:</label>
    <select name="behaviorPersonalityMod" id="mgme_behavior_personality_mod" style="margin-bottom:10px;width:45px" onchange="_mgeFillRefreshDisposition(this.parentElement.parentElement)">
      <option value="-2">-2</option>
      <option value="0" selected>0</option>
      <option value="2">+2</option>
    </select>
    <input style="vertical-align:middle;" type="checkbox" id="mgme_behavior_personality_active" onchange="_mgeFillRefreshDisposition(this.parentElement.parentElement)">
    </div>

    <div>
    <label for="behaviorActivity">Activity:</label>
    <input name="behaviorActivity" id="mgme_behavior_activity" onchange="_mgeSaveActorBehaviorFromHTML(this.parentElement.parentElement)" style="margin-bottom:10px;width:168px;margin-left:21px;" placeholder="Descriptor">
    <i style="width:auto;height:25px;" class="fas fa-dice" onclick="_mgeFillRandomActivity('#mgme_behavior_activity')"></i>
    <label for="behaviorActivityMod">Mod:</label>
    <select name="behaviorActivityMod" id="mgme_behavior_activity_mod" style="margin-bottom: 10px;width:45px" onchange="_mgeFillRefreshDisposition(this.parentElement.parentElement)">
      <option value="-2">-2</option>
      <option value="0" selected>0</option>
      <option value="2">+2</option>
    </select>
    <input style="vertical-align:middle;" type="checkbox" id="mgme_behavior_activity_active" onchange="_mgeFillRefreshDisposition(this.parentElement.parentElement)">
    </div>

    <div>
    <label for="behaviorDisposition">Disposition:</label>
    <input disabled name="behaviorDisposition" id="mgme_behavior_disposition" style="margin-bottom: 10px;width:148px">
    <input disabled type="number" name="behaviorDispositionValue" id="mgme_behavior_disposition_value" style="margin-bottom: 10px;width:20px;height:17px">
    <i style="width:auto;height:25px;margin-right:10px;" class="fas fa-dice" onclick="_mgeFillRandomDisposition(this.parentElement.parentElement)"></i>
    <i style="width:auto;height:25px;margin-right:10px;" class="fas fa-arrow-up" onclick="_mgeFillAdjustedDisposition(this.parentElement.parentElement, 2)"></i>
    <i style="width:auto;height:25px;" class="fas fa-arrow-down" onclick="_mgeFillAdjustedDisposition(this.parentElement.parentElement, -2)"></i>
    </div>

    </form>

    <style>
    i:hover {
        text-shadow: 0 0 8px red;
    }
    </style>
    `

  let dialogue = new Dialog({
    title: `Behavior Check`,
    content: behaviorCheckDialog,
    render: html => {
      const tokenBehavior = selectedToken.actor.getFlag('mythic-gme-tools', 'mgeBehavior');
      if (tokenBehavior) {
        html.find("#mgme_behavior_theme").val(tokenBehavior.theme);
        html.find("#mgme_behavior_identity").val(tokenBehavior.identity);
        html.find("#mgme_behavior_identity_mod").val(tokenBehavior.identityMod);
        html.find("#mgme_behavior_identity_active").prop('checked', tokenBehavior.identityActive);
        html.find("#mgme_behavior_personality").val(tokenBehavior.personality);
        html.find("#mgme_behavior_personality_mod").val(tokenBehavior.personalityMod);
        html.find("#mgme_behavior_personality_active").prop('checked', tokenBehavior.personalityActive);
        html.find("#mgme_behavior_activity").val(tokenBehavior.activity);
        html.find("#mgme_behavior_activity_mod").val(tokenBehavior.activityMod);
        html.find("#mgme_behavior_activity_active").prop('checked', tokenBehavior.activityActive);
        html.find("#mgme_behavior_disposition").val(tokenBehavior.dispositionRank)
        html.find("#mgme_behavior_disposition_value").val(tokenBehavior.dispositionValue)
      }
    },
    buttons: {
      rollAction: {
        icon: '<i class="fas fa-fist-raised"></i>',
        label: 'Action!',
        callback: async (html) => {
          const actorBehavior = _mgeSaveActorBehaviorFromHTML(html, selectedToken.actor);
          await _mgeBehaviorAction(selectedToken, actorBehavior);
        }
      },
      sendChat: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: (html) => {
          const actorBehavior = _mgeSaveActorBehaviorFromHTML(html, selectedToken.actor);
          const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
          let chatBehavior = {
            content: `
            <div><h1>${selectedToken.name}</h1></div>
            <div><b>Theme:</b> ${actorBehavior.theme}</div>
            <div><b>Identity:</b> ${actorBehavior.identity} (${actorBehavior.identityActive ? actorBehavior.identityMod : 'inactive'})</div>
            <div><b>Personality:</b> ${actorBehavior.personality} (${actorBehavior.personalityActive ? actorBehavior.personalityMod : 'inactive'})</div>
            <div><b>Activity:</b> ${actorBehavior.activity} (${actorBehavior.activityActive ? actorBehavior.activityMod : 'inactive'})</div>
            <div><b>Disposition:</b> ${actorBehavior.dispositionRank} [${actorBehavior.dispositionValue}]</div>
            `,
            whisper: whisper
          };
          ChatMessage.create(chatBehavior);
        }
      }
    },
    default: "sendChat"
  })

  dialogue.render(true)
}

function _mgeStatisticsEntryAdd(html) {
  const elem = $(html);
  elem.find(".stat-hidden").first().removeClass('stat-hidden');
}

function mgeStatisticCheck() {
  const statisticDialog = `
      <form>
      
      <div>
      <label for="statisticTarget">Statistic Target:</label>
      <input name="statisticTarget" id="mgme_statistic_target" style="margin-bottom:10px;width:285px;" placeholder="Target"/>
      </div>
      
      <div id="mgme_stats_container"></div>
      <div><i style="width:auto;height:25px;" class="fas fa-plus" onclick="_mgeStatisticsEntryAdd(this.parentElement.parentElement)"> Add</i></div>
      
      <div>
        <label for="isImportant">is important:</label>
        <input name="isImportant" id="mgme_statistic_important" type="checkbox" style="vertical-align:middle">
      </div>
        
      </div>
      
      <style>
        i:hover {
            text-shadow: 0 0 8px red;
        }
        .stat-hidden {
            visibility: hidden;
        }
      </style>
      
      </form>
      `
  const tokenName = canvas.tokens.controlled[0]?.name;
  let dialogue = new Dialog({
    title: 'Statistic Check',
    content: statisticDialog,
    render: async function (html) {
      // in the future we can consider saving the baselines?
      // const savedBaseline = game.user.getFlag('mythic-gme-tools', 'mgeStatisticBaseline');
      if (tokenName)
        html.find("#mgme_statistic_target").val(tokenName);
      const entriesOpen = 3; // Configurable???
      let i = 1;
      while (i <= 5) {
        let cls = i <= entriesOpen ? '' : 'stat-hidden';
        html.find("#mgme_stats_container").append(
          `
          <div id="stats_${i}" class="${cls}">
            <input id="mgme_statistic_attribute_${i}" required style="margin-bottom:10px;width:140px;height:25px;" placeholder="Attribute #${i}"/>
            <input id="mgme_statistic_baseline_${i}" placeholder="Baseline" style="width:60px" type="number">
            <select id="mgme_statistic_mod_${i}" style="width:110px;margin-bottom:10px;">
              <option value="-2">Weak (-2)</option>
              <option value="0" selected>No Modifier</option>
              <option value="2">Strong (+2)</option>
              <option value="4">Prime (+4)</option>
            </select>
            <span title="Important" class="fas fa-exclamation-triangle" style="margin-left:5px;vertical-align:middle;"></span>
          </div>
          `
        )
        i += 1;
      }

      html[0].getElementsByTagName("input").mgme_statistic_attribute_1.focus();
    },
    buttons: {
      submit: {
        icon: '<i class="fas fa-comments"></i>',
        label: 'To Chat',
        callback: async (html) => {
          const attribute = html.find(`#mgme_statistic_attribute_1`).val();
          if (!attribute)
            return;
          const whisper = ui.chat.getData().rollMode !== 'roll' ? [game.user] : undefined;
          const isImportant = html.find("#mgme_statistic_important").prop('checked');
          let statisticChat = {
            content: `
            <h1>${tokenName ?? 'Statistic Check'}</h1>
            <div><b style="color:darkred">${isImportant ? 'IMPORTANT' : ''}</b></div>
            `,
            whisper: whisper,
            speaker: ChatMessage.getSpeaker()
          };
          let i = 0;
          while (i < 5) {
            i += 1;
            if (html.find(`#stats_${i}`).hasClass('stat-hidden'))
              continue
            const attribute = html.find(`#mgme_statistic_attribute_${i}`).val();
            if (!attribute.length)
              continue;
            const baseline = parseInt(html.find(`#mgme_statistic_baseline_${i}`).val());
            const baselineValue = isNaN(baseline) ? 0 : baseline;
            const mod = _mgeParseNumberFromText(html.find(`#mgme_statistic_mod_${i}`).val());
            const modText = html.find(`#mgme_statistic_mod_${i} option:selected`).text();
            const statTable = await _mgeFindTableByName('Mythic GME: Statistic Check');
            const targetRoll = new Roll(`2d10 + ${mod} + ${isImportant ? 2 : 0}`);
            const statResult = (await statTable.draw({roll: targetRoll, displayChat: false})).results[0].getChatText();
            // In most RPGs this stat calculation is probably off on the default table (+100%) - But leaving in case players override table
            const statMultiplier = (_mgeParseNumberFromText(statResult)/100)+1;
            const statFinal = baselineValue * statMultiplier;
            statisticChat.content += `
              <div><h2>${attribute}</h2></div>
              ${isNaN(baseline) ? '' : `<div><b>Baseline:</b> ${baselineValue}</div>`}
              <div><b>Reference:</b> ${modText}</div>
              <div><b>Statistic:</b> ${statResult}${statFinal === 0 ? '' : ` -> ${statFinal}`}</div>
            `
          }
          ChatMessage.create(statisticChat);
        }
      }
    },
    default: "submit"
  })
  dialogue.render(true)
}