const SUITS = [
  { key: "B", ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9] }, // 条
  { key: "C", ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9] }, // 筒
  { key: "D", ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9] }, // 万
];

const HONORS = ["WE", "WS", "WW", "WN", "DR", "DG", "DW"];

const TILE_LABELS = {
  WE: "东",
  WS: "南",
  WW: "西",
  WN: "北",
  DR: "中",
  DG: "发",
  DW: "白",
};

const PLAYERS = ["你", "电脑A", "电脑B", "电脑C"];
const WAN_CHINESE = ["壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
const CLAIM_PRIORITY = { chi: 1, peng: 2, gang: 3 };
const THEME_KEY = "majiang-theme";
const THEMES = [
  { key: "classic", label: "经典牌桌" },
  { key: "festive", label: "新春喜庆" },
];

const state = {
  players: [],
  wall: [],
  discards: [],
  current: 0,
  gameOver: false,
  thinking: false,
  lastDrawn: null,
  pendingClaim: null,
  needsDraw: true,
  drawReason: "normal",
};

const statusEl = document.getElementById("status");
const wallCountEl = document.getElementById("wall-count");
const turnEl = document.getElementById("turn-indicator");
const discardPoolEl = document.getElementById("discard-pool");
const controlsEl = document.getElementById("controls");
const newGameBtn = document.getElementById("new-game-btn");
const sortBtn = document.getElementById("sort-btn");
const themeBtn = document.getElementById("theme-btn");
const overlayEl = document.getElementById("gameover-overlay");
const overlayTextEl = document.getElementById("gameover-text");
const overlayRestartBtn = document.getElementById("gameover-restart");
const rootEl = document.body;

newGameBtn.addEventListener("click", startGame);
sortBtn.addEventListener("click", () => {
  const you = state.players[0];
  if (!you || state.gameOver || state.pendingClaim) return;
  you.hand.sort(compareTiles);
  render();
});
if (themeBtn) {
  themeBtn.addEventListener("click", toggleTheme);
}
overlayRestartBtn.addEventListener("click", startGame);

applyTheme(getSavedTheme());

function tileToText(tile) {
  if (TILE_LABELS[tile]) return TILE_LABELS[tile];
  const suit = tile[0];
  const rank = tile.slice(1);
  if (suit === "B") return `${rank}条`;
  if (suit === "C") return `${rank}筒`;
  return `${rank}万`;
}

function getStorage() {
  return typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : null;
}

function getThemeByKey(themeKey) {
  if (themeKey === "copilot") return THEMES[1];
  return THEMES.find((theme) => theme.key === themeKey) || THEMES[0];
}

function getSavedTheme() {
  const storage = getStorage();
  const saved = storage ? storage.getItem(THEME_KEY) : null;
  return getThemeByKey(saved).key;
}

function applyTheme(themeKey) {
  const theme = getThemeByKey(themeKey);
  if (rootEl) {
    rootEl.dataset.theme = theme.key;
  }
  if (themeBtn) {
    themeBtn.textContent = `主题：${theme.label}`;
  }
  const storage = getStorage();
  if (storage) {
    storage.setItem(THEME_KEY, theme.key);
  }
}

function toggleTheme() {
  const currentTheme = rootEl?.dataset.theme || THEMES[0].key;
  const currentIndex = THEMES.findIndex((theme) => theme.key === currentTheme);
  const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
  applyTheme(nextTheme.key);
}

function buildTileElement(tile, discarded = false) {
  const el = document.createElement("div");
  el.className = "tile";
  if (discarded) el.classList.add("discarded");
  el.dataset.tile = tile;

  const content = document.createElement("div");
  content.className = "tile-content";

  if (TILE_LABELS[tile]) {
    el.classList.add("honor");
    el.classList.add(`honor-${tile.toLowerCase()}`);
    const center = document.createElement("div");
    center.className = "tile-center honor-center";
    center.textContent = TILE_LABELS[tile];
    content.appendChild(center);
  } else {
    const suit = tile[0];
    const rank = Number(tile.slice(1));
    const center = document.createElement("div");
    center.className = "tile-center";

    if (suit === "D") {
      el.classList.add("suit-wan");
      const zh = WAN_CHINESE[rank - 1] || String(rank);
      const num = document.createElement("div");
      num.className = "wan-num";
      num.textContent = zh;
      const label = document.createElement("div");
      label.className = "wan-label";
      label.textContent = "万";
      center.appendChild(num);
      center.appendChild(label);
    } else if (suit === "B") {
      el.classList.add("suit-tiao");
      const num = document.createElement("div");
      num.className = "tiao-num";
      num.textContent = rank;
      const label = document.createElement("div");
      label.className = "tiao-label";
      label.textContent = "条";
      center.appendChild(num);
      center.appendChild(label);
    } else if (suit === "C") {
      el.classList.add("suit-tong");
      const num = document.createElement("div");
      num.className = "tong-num";
      num.textContent = rank;
      const label = document.createElement("div");
      label.className = "tong-label";
      label.textContent = "筒";
      center.appendChild(num);
      center.appendChild(label);
    }

    content.appendChild(center);
  }

  el.appendChild(content);
  return el;
}

function makeWall() {
  const wall = [];
  SUITS.forEach((suit) => {
    suit.ranks.forEach((rank) => {
      const tile = `${suit.key}${rank}`;
      for (let i = 0; i < 4; i += 1) wall.push(tile);
    });
  });
  HONORS.forEach((tile) => {
    for (let i = 0; i < 4; i += 1) wall.push(tile);
  });
  for (let i = wall.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}

function compareTiles(a, b) {
  return tileIndex(a) - tileIndex(b);
}

function tileIndex(tile) {
  if (HONORS.includes(tile)) return 27 + HONORS.indexOf(tile);
  const suit = tile[0];
  if (suit === "B") return Number(tile.slice(1)) - 1;
  if (suit === "C") return 9 + Number(tile.slice(1)) - 1;
  if (suit === "D") return 18 + Number(tile.slice(1)) - 1;
  return -1;
}

function countsFromTiles(tiles) {
  const counts = new Array(34).fill(0);
  tiles.forEach((t) => {
    counts[tileIndex(t)] += 1;
  });
  return counts;
}

function canHu(tiles) {
  if (tiles.length % 3 !== 2) return false;
  const counts = countsFromTiles(tiles);
  for (let i = 0; i < 34; i += 1) {
    if (counts[i] >= 2) {
      counts[i] -= 2;
      if (canFormMelds(counts)) {
        counts[i] += 2;
        return true;
      }
      counts[i] += 2;
    }
  }
  return false;
}

function canFormMelds(counts) {
  const test = counts.slice();
  for (let i = 27; i < 34; i += 1) {
    if (test[i] % 3 !== 0) return false;
  }
  for (const start of [0, 9, 18]) {
    for (let i = start; i < start + 9; i += 1) {
      while (test[i] > 0) {
        if (test[i] >= 3) {
          test[i] -= 3;
          continue;
        }
        const r = i - start;
        if (r <= 6 && test[i + 1] > 0 && test[i + 2] > 0) {
          test[i] -= 1;
          test[i + 1] -= 1;
          test[i + 2] -= 1;
        } else {
          return false;
        }
      }
    }
  }
  return true;
}

function countTile(hand, tile) {
  return hand.filter((t) => t === tile).length;
}

function removeTilesFromHand(hand, tiles) {
  for (const tile of tiles) {
    const idx = hand.indexOf(tile);
    if (idx === -1) return false;
    hand.splice(idx, 1);
  }
  return true;
}

function turnDistance(fromIdx, targetIdx) {
  return (targetIdx - fromIdx + 4) % 4;
}

function isSuitTile(tile) {
  return !TILE_LABELS[tile];
}

function getChiOptions(hand, discardTile) {
  if (!isSuitTile(discardTile)) return [];
  const suit = discardTile[0];
  const rank = Number(discardTile.slice(1));
  const patterns = [
    [rank - 2, rank - 1],
    [rank - 1, rank + 1],
    [rank + 1, rank + 2],
  ];

  return patterns
    .filter((pair) => pair.every((value) => value >= 1 && value <= 9))
    .filter((pair) => pair.every((value) => hand.includes(`${suit}${value}`)))
    .map((pair) => {
      const tiles = [...pair.map((value) => `${suit}${value}`), discardTile].sort(compareTiles);
      return {
        type: "chi",
        tiles,
        useTiles: pair.map((value) => `${suit}${value}`),
      };
    });
}

function getSelfGangOptions(player) {
  const counts = countsFromTiles(player.hand);
  const concealed = counts
    .map((count, idx) => (count === 4 ? idx : -1))
    .filter((idx) => idx >= 0)
    .map((idx) => indexToTile(idx))
    .map((tile) => ({
      type: "concealed-gang",
      tile,
      label: `暗杠 ${tileToText(tile)}`,
    }));

  const added = player.melds
    .map((meld, meldIndex) => ({ meld, meldIndex }))
    .filter(({ meld }) => meld.type === "peng" && countTile(player.hand, meld.tiles[0]) >= 1)
    .map(({ meld, meldIndex }) => ({
      type: "added-gang",
      tile: meld.tiles[0],
      meldIndex,
      label: `补杠 ${tileToText(meld.tiles[0])}`,
    }));

  return [...concealed, ...added];
}

function indexToTile(index) {
  if (index >= 27) return HONORS[index - 27];
  if (index < 9) return `B${index + 1}`;
  if (index < 18) return `C${index - 8}`;
  return `D${index - 17}`;
}

function createPlayer(name, idx) {
  return {
    name,
    hand: [],
    isHuman: idx === 0,
    discards: [],
    melds: [],
  };
}

function startGame() {
  state.players = PLAYERS.map(createPlayer);
  state.wall = makeWall();
  state.discards = [];
  state.current = 0;
  state.gameOver = false;
  state.thinking = false;
  state.lastDrawn = null;
  state.pendingClaim = null;
  state.needsDraw = true;
  state.drawReason = "normal";
  overlayEl.classList.remove("show");
  overlayEl.setAttribute("aria-hidden", "true");
  clearControls();

  for (let r = 0; r < 13; r += 1) {
    for (let p = 0; p < 4; p += 1) {
      state.players[p].hand.push(state.wall.pop());
    }
  }
  state.players.forEach((player) => player.hand.sort(compareTiles));

  beginTurn();
}

function beginTurn() {
  if (state.gameOver || state.pendingClaim) return;
  const player = state.players[state.current];

  if (state.needsDraw) {
    if (state.wall.length === 0) {
      finishGame("流局：牌墙摸完了。");
      return;
    }

    const drawTile = state.wall.pop();
    const beforeCounts = countsFromTiles(player.hand);
    player.hand.push(drawTile);
    player.hand.sort(compareTiles);
    state.lastDrawn = {
      playerIdx: state.current,
      tile: drawTile,
      occurrence: beforeCounts[tileIndex(drawTile)] + 1,
    };
  } else {
    state.lastDrawn = null;
  }

  if (player.isHuman) {
    handleHumanTurn(player);
    return;
  }
  handleBotTurn(player);
}

function handleHumanTurn(player) {
  const actions = [];
  if (state.needsDraw && canHu(player.hand)) {
    actions.push({
      text: "自摸胡",
      onClick: () => finishGame("你自摸胡牌，胜利！"),
    });
  }

  if (state.needsDraw) {
    getSelfGangOptions(player).forEach((option) => {
      actions.push({
        text: option.label,
        onClick: () => executeSelfGang(0, option),
      });
    });
  }

  if (state.needsDraw) {
    const prefix = state.drawReason === "supplement" ? "补摸完成" : "轮到你";
    render(actions.length ? `${prefix}，可选择操作或打出一张牌。` : `${prefix}，请打出一张牌。`);
  } else {
    render("你已吃/碰，请打出一张牌。");
  }

  showControls(actions, {
    passText: "继续打牌",
    onPass: actions.length ? () => clearControls() : null,
    disablePassWhenEmpty: true,
  });
}

function handleBotTurn(player) {
  if (state.needsDraw && canHu(player.hand)) {
    setTimeout(() => finishGame(`${player.name} 自摸胡牌。`), 600);
    return;
  }

  if (state.needsDraw) {
    const gangOptions = getSelfGangOptions(player);
    if (gangOptions.length > 0) {
      const selected = gangOptions[0];
      render(`${player.name} 选择${selected.label}...`);
      state.thinking = true;
      setTimeout(() => {
        if (state.gameOver) return;
        executeSelfGang(state.current, selected);
      }, 420);
      return;
    }
  }

  render(
    state.needsDraw ? `${player.name} 正在思考出牌...` : `${player.name} 已吃/碰，正在思考出牌...`,
  );
  state.thinking = true;
  setTimeout(() => {
    if (state.gameOver) return;
    const tile = chooseBotDiscard(player.hand);
    discardTile(state.current, tile);
  }, 500 + Math.random() * 550);
}

function chooseBotDiscard(hand) {
  let worstTile = hand[0];
  let worstScore = Number.POSITIVE_INFINITY;
  for (const tile of hand) {
    const score = synergyScore(tile, hand);
    if (score < worstScore) {
      worstScore = score;
      worstTile = tile;
    }
  }
  return worstTile;
}

function synergyScore(tile, hand) {
  const suit = tile[0];
  const rank = Number(tile.slice(1));
  let score = 0;

  const sameCount = hand.filter((t) => t === tile).length;
  if (sameCount >= 2) score += 3;

  if (suit === "B" || suit === "C" || suit === "D") {
    const near1 = hand.includes(`${suit}${rank - 1}`) + hand.includes(`${suit}${rank + 1}`);
    const near2 = hand.includes(`${suit}${rank - 2}`) + hand.includes(`${suit}${rank + 2}`);
    score += near1 * 2 + near2;
    if (rank === 1 || rank === 9) score -= 0.4;
  } else {
    score += sameCount * 1.5;
  }

  return score + Math.random() * 0.2;
}

function discardTile(playerIdx, tile) {
  if (state.gameOver || state.pendingClaim) return;
  const player = state.players[playerIdx];
  if (playerIdx !== state.current) return;
  if (player.isHuman && state.thinking) return;

  const idx = player.hand.indexOf(tile);
  if (idx === -1) return;

  player.hand.splice(idx, 1);
  player.hand.sort(compareTiles);
  player.discards.push(tile);
  state.discards.push({ tile, by: playerIdx });
  state.thinking = false;
  state.needsDraw = true;
  state.drawReason = "normal";
  state.lastDrawn = null;
  clearControls();

  resolveDiscard(playerIdx, tile);
}

function resolveDiscard(playerIdx, tile) {
  for (let offset = 1; offset <= 3; offset += 1) {
    const targetIdx = (playerIdx + offset) % 4;
    const target = state.players[targetIdx];
    if (canHu(target.hand.concat(tile))) {
      finishGame(`${target.name} 点炮胡牌（胡 ${PLAYERS[playerIdx]} 的 ${tileToText(tile)}）。`);
      return;
    }
  }

  const claims = getClaimCandidates(playerIdx, tile);
  resolveClaimCandidates(claims, playerIdx, tile);
}

function getClaimCandidates(fromIdx, tile) {
  const candidates = [];
  for (let offset = 1; offset <= 3; offset += 1) {
    const playerIdx = (fromIdx + offset) % 4;
    const player = state.players[playerIdx];
    const sameCount = countTile(player.hand, tile);

    if (sameCount >= 3) {
      candidates.push({
        playerIdx,
        fromIdx,
        discardTile: tile,
        type: "gang",
        priority: CLAIM_PRIORITY.gang,
        distance: turnDistance(fromIdx, playerIdx),
        text: `明杠 ${tileToText(tile)}`,
      });
    }

    if (sameCount >= 2) {
      candidates.push({
        playerIdx,
        fromIdx,
        discardTile: tile,
        type: "peng",
        priority: CLAIM_PRIORITY.peng,
        distance: turnDistance(fromIdx, playerIdx),
        text: `碰 ${tileToText(tile)}`,
      });
    }

    if (offset === 1) {
      getChiOptions(player.hand, tile).forEach((option) => {
        candidates.push({
          playerIdx,
          fromIdx,
          discardTile: tile,
          type: "chi",
          priority: CLAIM_PRIORITY.chi,
          distance: turnDistance(fromIdx, playerIdx),
          useTiles: option.useTiles,
          meldTiles: option.tiles,
          text: `吃 ${option.tiles.map(tileToText).join("")}`,
        });
      });
    }
  }

  return candidates.sort((a, b) => b.priority - a.priority || a.distance - b.distance);
}

function resolveClaimCandidates(candidates, fromIdx, tile) {
  if (state.gameOver) return;
  if (candidates.length === 0) {
    advanceToNextTurn(fromIdx);
    return;
  }

  const best = candidates[0];
  if (best.playerIdx === 0) {
    promptHumanClaim(best, candidates, fromIdx, tile);
    return;
  }

  const claimant = state.players[best.playerIdx];
  render(`${claimant.name} 想要${best.text}...`);
  state.thinking = true;
  setTimeout(() => {
    if (state.gameOver) return;
    executeClaim(best);
  }, 480);
}

function promptHumanClaim(bestClaim, candidates, fromIdx, tile) {
  const sameWindowClaims = candidates.filter(
    (candidate) =>
      candidate.playerIdx === bestClaim.playerIdx && candidate.priority === bestClaim.priority,
  );
  const fallbackClaims = candidates.filter(
    (candidate) =>
      !(candidate.playerIdx === bestClaim.playerIdx && candidate.priority === bestClaim.priority),
  );

  state.pendingClaim = {
    fromIdx,
    tile,
    fallbackClaims,
  };

  render(`${PLAYERS[fromIdx]} 打出 ${tileToText(tile)}，你可以选择吃/碰/杠。`);
  showControls(
    sameWindowClaims.map((claim) => ({
      text: claim.text,
      onClick: () => {
        state.pendingClaim = null;
        executeClaim(claim);
      },
    })),
    {
      passText: "过",
      onPass: () => {
        const pending = state.pendingClaim;
        state.pendingClaim = null;
        clearControls();
        resolveClaimCandidates(pending ? pending.fallbackClaims : [], fromIdx, tile);
      },
      disablePassWhenEmpty: false,
    },
  );
}

function executeClaim(claim) {
  const claimant = state.players[claim.playerIdx];
  const discardTile = claim.discardTile;
  const removed = removeLastDiscard(claim.fromIdx, discardTile);
  if (!removed) return;

  clearControls();
  state.pendingClaim = null;
  state.current = claim.playerIdx;
  state.thinking = false;
  state.lastDrawn = null;

  if (claim.type === "chi") {
    removeTilesFromHand(claimant.hand, claim.useTiles);
    claimant.melds.push({
      type: "chi",
      tiles: claim.meldTiles.slice(),
      concealed: false,
    });
    claimant.hand.sort(compareTiles);
    state.needsDraw = false;
    state.drawReason = "claim";
    afterClaimTurn(claim, `${claimant.name} 吃了 ${tileToText(discardTile)}。`);
    return;
  }

  if (claim.type === "peng") {
    removeTilesFromHand(claimant.hand, [discardTile, discardTile]);
    claimant.melds.push({
      type: "peng",
      tiles: [discardTile, discardTile, discardTile],
      concealed: false,
    });
    claimant.hand.sort(compareTiles);
    state.needsDraw = false;
    state.drawReason = "claim";
    afterClaimTurn(claim, `${claimant.name} 碰了 ${tileToText(discardTile)}。`);
    return;
  }

  removeTilesFromHand(claimant.hand, [discardTile, discardTile, discardTile]);
  claimant.melds.push({
    type: "gang",
    tiles: [discardTile, discardTile, discardTile, discardTile],
    concealed: false,
  });
  claimant.hand.sort(compareTiles);
  state.needsDraw = true;
  state.drawReason = "supplement";
  render(`${claimant.name} 明杠了 ${tileToText(discardTile)}，准备补摸一张。`);
  setTimeout(beginTurn, 260);
}

function afterClaimTurn(claim, statusText) {
  const claimant = state.players[claim.playerIdx];
  if (claimant.isHuman) {
    render(`${statusText} 请打出一张牌。`);
    return;
  }

  render(`${statusText} ${claimant.name} 正在思考出牌...`);
  state.thinking = true;
  setTimeout(() => {
    if (state.gameOver) return;
    const tile = chooseBotDiscard(claimant.hand);
    discardTile(claim.playerIdx, tile);
  }, 520);
}

function executeSelfGang(playerIdx, option) {
  const player = state.players[playerIdx];
  clearControls();
  state.pendingClaim = null;
  state.thinking = false;
  state.current = playerIdx;
  state.lastDrawn = null;

  if (option.type === "concealed-gang") {
    removeTilesFromHand(player.hand, [option.tile, option.tile, option.tile, option.tile]);
    player.melds.push({
      type: "gang",
      tiles: [option.tile, option.tile, option.tile, option.tile],
      concealed: true,
    });
    player.hand.sort(compareTiles);
    state.needsDraw = true;
    state.drawReason = "supplement";
    render(`${player.name} ${option.label}，补摸一张。`);
    setTimeout(beginTurn, 260);
    return;
  }

  removeTilesFromHand(player.hand, [option.tile]);
  const meld = player.melds[option.meldIndex];
  meld.type = "gang";
  meld.tiles = [option.tile, option.tile, option.tile, option.tile];
  meld.added = true;
  player.hand.sort(compareTiles);
  state.needsDraw = true;
  state.drawReason = "supplement";
  render(`${player.name} ${option.label}，补摸一张。`);
  setTimeout(beginTurn, 260);
}

function removeLastDiscard(playerIdx, tile) {
  const player = state.players[playerIdx];
  const handDiscardIdx = player.discards.lastIndexOf(tile);
  const poolIdx = findLastDiscardIndex(playerIdx, tile);
  if (handDiscardIdx === -1 || poolIdx === -1) return false;
  player.discards.splice(handDiscardIdx, 1);
  state.discards.splice(poolIdx, 1);
  return true;
}

function findLastDiscardIndex(playerIdx, tile) {
  for (let i = state.discards.length - 1; i >= 0; i -= 1) {
    if (state.discards[i].by === playerIdx && state.discards[i].tile === tile) {
      return i;
    }
  }
  return -1;
}

function advanceToNextTurn(fromIdx) {
  state.current = (fromIdx + 1) % 4;
  state.needsDraw = true;
  state.drawReason = "normal";
  render();
  setTimeout(beginTurn, 260);
}

function showControls(
  actions,
  { passText = "继续打牌", onPass = null, disablePassWhenEmpty = true } = {},
) {
  controlsEl.innerHTML = "";
  actions.forEach((action) => {
    const btn = document.createElement("button");
    if (action.danger) btn.classList.add("danger");
    btn.textContent = action.text;
    btn.onclick = action.onClick;
    controlsEl.appendChild(btn);
  });

  const passBtn = document.createElement("button");
  passBtn.className = "secondary";
  passBtn.textContent = passText;
  passBtn.disabled = actions.length === 0 && disablePassWhenEmpty;
  passBtn.onclick = () => {
    if (passBtn.disabled) return;
    if (onPass) onPass();
  };
  controlsEl.appendChild(passBtn);
}

function clearControls() {
  controlsEl.innerHTML = "";
}

function finishGame(text) {
  state.gameOver = true;
  state.thinking = false;
  state.pendingClaim = null;
  state.lastDrawn = null;
  statusEl.textContent = text;
  statusEl.classList.add("gameover");
  overlayTextEl.textContent = text;
  overlayEl.classList.add("show");
  overlayEl.setAttribute("aria-hidden", "false");
  turnEl.textContent = "对局结束";
  clearControls();
  const again = document.createElement("button");
  again.textContent = "再来一局";
  again.onclick = startGame;
  controlsEl.appendChild(again);
  renderPlayers();
  renderDiscards();
}

function render(customStatus) {
  statusEl.textContent =
    customStatus || (state.gameOver ? statusEl.textContent : "牌局进行中，先胡牌者获胜。");
  if (!state.gameOver) statusEl.classList.remove("gameover");
  wallCountEl.textContent = `牌墙剩余：${state.wall.length} 张`;
  turnEl.textContent = state.gameOver ? "对局结束" : `当前轮到：${PLAYERS[state.current]}`;
  renderPlayers();
  renderDiscards();
}

function renderPlayers() {
  state.players.forEach((player, idx) => {
    const el = document.getElementById(`player-${idx}`);
    el.innerHTML = "";

    const header = document.createElement("div");
    header.className = "player-header";
    const name = document.createElement("div");
    name.className = `player-name ${state.current === idx && !state.gameOver ? "turning" : ""}`;
    name.textContent = player.name;
    const info = document.createElement("div");
    info.textContent = player.isHuman ? `${player.hand.length} 张手牌` : `手牌 ${player.hand.length} 张`;
    header.appendChild(name);
    header.appendChild(info);
    el.appendChild(header);

    if (player.melds.length > 0) {
      const melds = document.createElement("div");
      melds.className = "melds";
      player.melds.forEach((meld) => {
        const meldEl = document.createElement("div");
        meldEl.className = `meld meld-${meld.type}`;
        meld.tiles.forEach((tile, tileIdx) => {
          const shouldHide = meld.concealed && (tileIdx === 0 || tileIdx === meld.tiles.length - 1);
          const meldTile = shouldHide ? document.createElement("div") : buildTileElement(tile, false);
          if (shouldHide) meldTile.className = "tile-back";
          meldTile.classList.add("meld-tile");
          meldEl.appendChild(meldTile);
        });
        melds.appendChild(meldEl);
      });
      el.appendChild(melds);
    }

    const tiles = document.createElement("div");
    tiles.className = "tiles";
    if (player.isHuman) {
      const seen = new Map();
      player.hand.forEach((tile) => {
        const t = buildTileElement(tile, false);
        const count = (seen.get(tile) || 0) + 1;
        seen.set(tile, count);
        if (
          state.lastDrawn &&
          state.lastDrawn.playerIdx === idx &&
          tile === state.lastDrawn.tile &&
          count === state.lastDrawn.occurrence
        ) {
          t.classList.add("new-draw");
        }
        if (
          !state.gameOver &&
          state.current === 0 &&
          !state.thinking &&
          !state.pendingClaim
        ) {
          t.classList.add("clickable");
          t.onclick = () => discardTile(0, tile);
        }
        tiles.appendChild(t);
      });
    } else {
      player.hand.forEach(() => {
        const back = document.createElement("div");
        back.className = "tile-back";
        tiles.appendChild(back);
      });
    }
    el.appendChild(tiles);

    const recent = document.createElement("div");
    recent.className = "recent-discards";
    player.discards.slice(-8).forEach((tile) => {
      const discarded = buildTileElement(tile, true);
      recent.appendChild(discarded);
    });
    el.appendChild(recent);
  });
}

function renderDiscards() {
  discardPoolEl.innerHTML = "";
  state.discards.slice(-42).forEach((item) => {
    const tile = buildTileElement(item.tile, true);
    tile.title = `由 ${PLAYERS[item.by]} 打出`;
    discardPoolEl.appendChild(tile);
  });
}

startGame();
