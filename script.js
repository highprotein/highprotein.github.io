document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const startScreen = document.getElementById("startScreen");
  const act1Screen = document.getElementById("act1Screen");
  let currentProduct = null;
  let selectedCount = 0;

  // Minigame Elements
  const minigameLayer = document.getElementById("minigame-layer");
  const minigameContent = document.getElementById("minigame-content");
  const closeMinigameBtn = document.getElementById("closeMinigameBtn");

  let bankBalance = 1000;
  let reputation = 50;
  let algoTrust = 50;

  // Start Screen Logic
  startBtn.addEventListener("click", () => {
    // Hide Start Screen
    startScreen.style.opacity = "0";
    setTimeout(() => {
      startScreen.style.display = "none";
      if (act1Screen) act1Screen.classList.remove("hidden");
      startTutorial();
    }, 500);
  });

  // Helper function to update stats
  function updateStats(balance, rep, trust) {
    const balanceDisplay = document.getElementById("bank-balance-display");
    const repBar = document.getElementById("reputation-bar");
    const repText = document.getElementById("reputation-text");
    const trustBar = document.getElementById("algotrust-bar");
    const trustText = document.getElementById("algotrust-text");

    if (balanceDisplay) {
      balanceDisplay.innerText = `£${balance}`;
      balanceDisplay.className = `text-2xl font-mono drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] ${balance < 0 ? "text-red-500" : "text-white"}`;
    }
    if (repBar) repBar.style.width = `${Math.max(0, Math.min(100, rep))}%`;
    if (repText) repText.innerText = `${Math.floor(rep)}%`;
    if (trustBar)
      trustBar.style.width = `${Math.max(0, Math.min(100, trust))}%`;
    if (trustText) trustText.innerText = `${Math.floor(trust)}%`;
  }

  // Sound Effect System
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playSound(type) {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "win") {
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); // C6
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } else if (type === "lose") {
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.linearRampToValueAtTime(50, now + 0.3);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    }
  }

  // Minigame Logic
  let activeGameLoop = null;
  let activeGameTimer = null;
  let activeMinigameContext = null;

  const minigameInstructions = {
    label: {
      title: "COVER UP",
      text: "Expired products cost you money. Scratch off the expiry date so customers do not notice.",
      button: "START SCRATCHING",
    },
    keyword: {
      title: "KEYWORD STUFFING",
      text: "The algorithm loves buzzwords. Catch as many tags as you can to confuse the search engine.",
      button: "START CATCHING",
    },
    price: {
      title: "PRICE ANCHOR",
      text: 'Make the "Original Price" look huge so the discount seems real. Stop the ticker in the Green Zone.',
      button: "START PUMPING",
    },
    rank: {
      title: "PAY TO WIN",
      text: "Competitors are pushing you down. Spam the BOOST button to stay in the top 3 slots.",
      button: "DEFEND RANK",
    },
  };

  function launchMinigame(gameType) {
    if (!minigameLayer || !minigameContent) return;

    minigameLayer.classList.remove("hidden");
    minigameContent.innerHTML = ""; // Clear existing content

    const instruction = minigameInstructions[gameType];

    if (instruction) {
      minigameContent.innerHTML = `
        <div class="flex flex-col items-center text-center max-w-md p-6 bg-slate-900 border-4 border-purple-500 rounded-xl shadow-2xl animate-fade-in">
            <h3 class="text-4xl font-black text-white mb-4 uppercase tracking-widest">${instruction.title}</h3>
            <p class="text-xl text-slate-300 mb-8 leading-relaxed font-mono">${instruction.text}</p>
            <button id="start-game-btn" class="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all transform hover:scale-105 uppercase tracking-widest text-xl">
                ${instruction.button}
            </button>
        </div>
       `;

      document
        .getElementById("start-game-btn")
        .addEventListener("click", () => {
          minigameContent.innerHTML = "";
          runMinigameLogic(gameType);
        });
    } else {
      runMinigameLogic(gameType);
    }
  }

  function runMinigameLogic(gameType) {
    switch (gameType) {
      case "label":
        startLabelScratcherGame();
        break;
      case "keyword":
        startKeywordCatcherGame();
        break;
      case "price":
        startPricePumperGame();
        break;
      case "rank":
        startRankDefenderGame();
        break;
    }
  }

  function endMinigame(success) {
    if (activeGameLoop) cancelAnimationFrame(activeGameLoop);
    if (activeGameTimer) clearInterval(activeGameTimer);
    activeGameLoop = null;
    activeGameTimer = null;

    // Hide minigame layer immediately
    if (minigameLayer) minigameLayer.classList.add("hidden");
    if (minigameContent) minigameContent.innerHTML = "";

    if (activeMinigameContext) {
      const { scenario, item, type, card, data, callbacks } =
        activeMinigameContext;
      let finalStats = {};
      let title = "";
      let body = "";

      if (success) {
        // Win Logic
        playSound("win");
        title = "SCAM SUCCESSFUL";
        body = "You pulled it off! The algorithm loves you. Sales are spiking.";

        // Take original stats and apply Skill Bonus (1.5x Algo Trust)
        finalStats = { ...data.stats };
        if (finalStats.algoTrust > 0) {
          finalStats.algoTrust = Math.floor(finalStats.algoTrust * 1.5);
        }
      } else {
        // Lose Logic
        playSound("lose");
        title = "SCAM FAILED";
        body =
          "You were too slow! The customers noticed. You lost money and trust.";
        finalStats = { bankBalance: -50, algoTrust: -10, reputation: -5 };
      }

      // Format stats for display
      const statsDisplay = [
        `Algo Trust: ${finalStats.algoTrust > 0 ? "+" : ""}${
          finalStats.algoTrust
        }`,
        `Reputation: ${finalStats.reputation > 0 ? "+" : ""}${
          finalStats.reputation
        }`,
        `Bank Balance: ${finalStats.bankBalance}`,
      ];

      // Use callbacks to trigger the main game modal and logic
      if (callbacks && callbacks.showOutcome) {
        callbacks.showOutcome(title, body, statsDisplay, () => {
          if (callbacks.applyEventConsequences) {
            callbacks.applyEventConsequences(finalStats, body, item);
          }
          if (success && callbacks.applyVisualSideEffects) {
            callbacks.applyVisualSideEffects(scenario, item, type);
          }
          if (card) card.classList.remove("border-purple-500", "animate-pulse");
        });
      }
    } else {
      // Fallback if no context
      if (success) {
        bankBalance += 100;
        updateStats(bankBalance, reputation, algoTrust);
      }
    }

    // Clear context
    activeMinigameContext = null;

    setTimeout(() => {
      if (minigameLayer) minigameLayer.classList.add("hidden");
      if (content) content.innerHTML = "";
    }, 1500);
  }

  function startLabelScratcherGame() {
    const content = document.getElementById("minigame-content");
    content.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <h3 class="text-white text-2xl font-bold uppercase">Scratch the Label!</h3>
        <p class="text-slate-400 text-sm">Reveal "EXP: 2022" to hide the evidence.</p>
        <div class="relative w-64 h-32 bg-white rounded-lg overflow-hidden shadow-2xl border-4 border-slate-600 cursor-crosshair">
          <canvas id="scratchCanvas" width="256" height="128"></canvas>
        </div>
        <p id="timerDisplay" class="text-red-500 font-mono text-xl">5.0s</p>
      </div>
    `;

    const canvas = document.getElementById("scratchCanvas");
    const ctx = canvas.getContext("2d");

    // Set background (The Secret) via CSS so we don't erase it
    canvas.style.background =
      'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128"><rect width="100%" height="100%" fill="white"/><text x="50%" y="50%" font-family="monospace" font-weight="bold" font-size="30" fill="red" dominant-baseline="middle" text-anchor="middle">EXP: 2022</text></svg>\')';

    // Draw Overlay
    ctx.fillStyle = "#94a3b8"; // Slate-400
    ctx.fillRect(0, 0, 256, 128);

    let isDrawing = false;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }

    function scratch(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.addEventListener("mousedown", (e) => {
      isDrawing = true;
      scratch(e);
    });
    canvas.addEventListener("mousemove", scratch);
    canvas.addEventListener("mouseup", () => (isDrawing = false));
    canvas.addEventListener("mouseleave", () => (isDrawing = false));
    canvas.addEventListener("touchstart", (e) => {
      isDrawing = true;
      scratch(e);
    });
    canvas.addEventListener("touchmove", scratch);
    canvas.addEventListener("touchend", () => (isDrawing = false));

    let timeLeft = 8.0;
    const timerDisplay = document.getElementById("timerDisplay");

    activeGameTimer = setInterval(() => {
      timeLeft -= 0.1;
      timerDisplay.innerText = timeLeft.toFixed(1) + "s";

      // Check Win
      const imageData = ctx.getImageData(0, 0, 256, 128);
      let transparentPixels = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparentPixels++;
      }
      const percent = transparentPixels / (256 * 128);

      if (percent > 0.5) {
        endMinigame(true);
      } else if (timeLeft <= 0) {
        endMinigame(false);
      }
    }, 100);
  }

  function startKeywordCatcherGame() {
    const content = document.getElementById("minigame-content");
    content.innerHTML = `
      <div class="relative w-[400px] h-[400px] bg-slate-900 border-4 border-purple-500 rounded-lg overflow-hidden cursor-none touch-none">
         <div id="basket" class="absolute bottom-2 w-16 h-8 bg-green-500 rounded border-2 border-white shadow-[0_0_10px_#22c55e]"></div>
         <div class="absolute top-2 right-2 text-white font-mono">Score: <span id="scoreVal">0</span>/3</div>
         <div class="absolute top-2 left-2 text-red-500 font-mono" id="timeVal">10s</div>
      </div>
      <p class="text-white mt-4">Catch the Buzzwords!</p>
    `;

    const container = content.querySelector("div");
    const basket = document.getElementById("basket");
    const scoreEl = document.getElementById("scoreVal");
    const timeEl = document.getElementById("timeVal");

    let score = 0;
    let timeLeft = 10;
    let basketX = 175;

    container.addEventListener("mousemove", (e) => {
      const rect = container.getBoundingClientRect();
      basketX = e.clientX - rect.left - 32;
      basketX = Math.max(0, Math.min(336, basketX));
      basket.style.left = basketX + "px";
    });

    const words = ["BASS", "4K", "HD", "GAMING", "EPIC"];
    let fallingItems = [];
    let lastTime = performance.now();
    let spawnTimer = 0;

    function loop(now) {
      const dt = now - lastTime;
      lastTime = now;

      spawnTimer += dt;
      if (spawnTimer > 800) {
        spawnTimer = 0;
        const word = words[Math.floor(Math.random() * words.length)];
        const el = document.createElement("div");
        el.innerText = word;
        el.className =
          "absolute text-xs font-bold text-yellow-300 drop-shadow-md";
        el.style.left = Math.random() * 350 + "px";
        el.style.top = "-20px";
        container.appendChild(el);
        fallingItems.push({ el, y: -20, speed: 0.07 + Math.random() * 0.05 });
      }

      for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        item.y += item.speed * dt;
        item.el.style.top = item.y + "px";

        if (item.y > 360 && item.y < 380) {
          const itemX = parseFloat(item.el.style.left);
          if (itemX + 20 > basketX && itemX < basketX + 64) {
            score++;
            scoreEl.innerText = score;
            item.el.remove();
            fallingItems.splice(i, 1);
            if (score >= 3) {
              endMinigame(true);
              return;
            }
            continue;
          }
        }
        if (item.y > 400) {
          item.el.remove();
          fallingItems.splice(i, 1);
        }
      }
      activeGameLoop = requestAnimationFrame(loop);
    }
    activeGameLoop = requestAnimationFrame(loop);

    activeGameTimer = setInterval(() => {
      timeLeft--;
      timeEl.innerText = timeLeft + "s";
      if (timeLeft <= 0) endMinigame(false);
    }, 1000);
  }

  function startPricePumperGame() {
    const content = document.getElementById("minigame-content");
    content.innerHTML = `
      <div class="flex flex-col items-center gap-6">
         <h3 class="text-white text-2xl font-bold uppercase">Stop in the Green!</h3>
         <div class="relative w-16 h-64 bg-slate-800 rounded-full border-4 border-slate-600 overflow-hidden">
            <div class="absolute bottom-[26%] h-[34%] w-full bg-green-500/50 border-y-2 border-green-400"></div>
            <div id="priceBar" class="absolute bottom-0 w-full bg-yellow-400 transition-none" style="height: 0%"></div>
         </div>
         <div class="text-4xl font-mono text-white">£<span id="priceVal">10</span></div>
         <button id="stopBtn" class="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded shadow-xl uppercase tracking-widest text-xl">STOP!</button>
      </div>
    `;

    const bar = document.getElementById("priceBar");
    const valDisplay = document.getElementById("priceVal");
    const stopBtn = document.getElementById("stopBtn");

    let price = 10;
    let direction = 1;
    let speed = 1.5;

    function loop() {
      price += speed * direction;
      if (price >= 300 || price <= 10) direction *= -1;
      bar.style.height = (price / 300) * 100 + "%";
      valDisplay.innerText = Math.floor(price);
      activeGameLoop = requestAnimationFrame(loop);
    }
    activeGameLoop = requestAnimationFrame(loop);

    function handleStop() {
      if (price >= 80 && price <= 180) endMinigame(true);
      else endMinigame(false);
    }
    stopBtn.addEventListener("click", handleStop);

    const spaceHandler = (e) => {
      if (e.code === "Space") {
        document.removeEventListener("keydown", spaceHandler);
        handleStop();
      }
    };
    document.addEventListener("keydown", spaceHandler);
  }

  function startRankDefenderGame() {
    const content = document.getElementById("minigame-content");
    content.innerHTML = `
      <div class="relative w-[300px] h-[400px] bg-slate-900 border-4 border-slate-700 rounded overflow-hidden select-none shadow-2xl">
         <!-- Green Zone (Safe) -->
         <div class="absolute top-0 w-full h-24 bg-green-900/20 border-b border-green-500/30 flex items-start justify-center pt-2">
            <span class="text-green-400/50 font-mono text-xs uppercase tracking-widest">Page 1 (Safe)</span>
         </div>

         <!-- Red Zone (Danger) -->
         <div class="absolute bottom-0 w-full h-12 bg-red-900/80 border-t-4 border-red-600 flex items-center justify-center">
            <span class="text-white font-black text-xs uppercase tracking-widest animate-pulse">PAGE 2 (INVISIBLE)</span>
         </div>

         <!-- Player Bar -->
         <div id="playerRank" class="absolute left-1/2 -translate-x-1/2 w-48 h-12 bg-yellow-400 border-2 border-white flex items-center justify-center font-black text-black shadow-[0_0_20px_rgba(250,204,21,0.6)] z-10 rounded">
            MY LISTING
         </div>

         <!-- Timer -->
         <div class="absolute top-2 right-2 text-white font-mono z-20 text-xl font-bold drop-shadow-md"><span id="survivalTime">5.0</span>s</div>
      </div>
      <p class="text-white mt-4 text-center font-mono text-sm text-slate-400">Click repeatedly to stay afloat!</p>
    `;

    const container = content.querySelector("div");
    const player = document.getElementById("playerRank");
    const timerEl = document.getElementById("survivalTime");

    let y = 50;
    let velocity = 0;
    const gravity = 0.15;
    const jumpPower = -6;
    const friction = 0.98;
    const floorLimit = 304; // 400 (h) - 48 (red zone) - 48 (bar)

    let timeLeft = 5.0;
    let isGameOver = false;

    const boost = (e) => {
      if (isGameOver) return;
      if (e && e.cancelable) e.preventDefault();
      velocity = jumpPower;
    };

    container.addEventListener("mousedown", boost);
    container.addEventListener("touchstart", boost);

    const keyHandler = (e) => {
      if (e.code === "Space") boost(e);
    };
    document.addEventListener("keydown", keyHandler);

    const cleanup = () => {
      document.removeEventListener("keydown", keyHandler);
    };

    let lastTime = performance.now();

    function loop(now) {
      if (isGameOver) return;

      const dt = now - lastTime;
      lastTime = now;

      velocity += gravity;
      velocity *= friction;
      y += velocity;

      if (y < 0) {
        y = 0;
        velocity = 0;
      }
      if (y >= floorLimit) {
        y = floorLimit;
        isGameOver = true;
        cleanup();
        endMinigame(false);
        return;
      }

      player.style.top = y + "px";
      activeGameLoop = requestAnimationFrame(loop);
    }
    activeGameLoop = requestAnimationFrame(loop);

    activeGameTimer = setInterval(() => {
      if (isGameOver) return;
      timeLeft -= 0.1;
      timerEl.innerText = Math.max(0, timeLeft).toFixed(1);

      if (timeLeft <= 0) {
        isGameOver = true;
        cleanup();
        endMinigame(true);
      }
    }, 100);
  }

  // Close Minigame Listener
  if (closeMinigameBtn) {
    closeMinigameBtn.addEventListener("click", () => {
      if (minigameLayer) minigameLayer.classList.add("hidden");
      if (minigameContent) minigameContent.innerHTML = "";
    });
  }

  function startTutorial() {
    const monkImg = document.getElementById("monkImg");
    const dialogueBox = document.getElementById("dialogueBox");
    const dialogueText = document.getElementById("dialogueText");
    const dialogueButtons = document.getElementById("dialogueButtons");
    const [option1Btn, option2Btn] = dialogueButtons.querySelectorAll("button");
    const statsDashboard = document.getElementById("statsDashboard");
    const rightPanel = document.getElementById("rightPanel");
    const continueBtn = document.getElementById("continueBtn");
    const productSelectionScreen = document.getElementById(
      "productSelectionScreen",
    );
    const productBtns = document.querySelectorAll(".product-btn");
    const itemCounter = document.getElementById("item-counter");
    const nameShopScreen = document.getElementById("nameShopScreen");
    const shopNameInput = document.getElementById("shopNameInput");
    const confirmNameBtn = document.getElementById("confirmNameBtn");
    const myShopScreen = document.getElementById("myShopScreen");
    const day3Dialogue = document.getElementById("day3Dialogue");
    const day3YesBtn = document.getElementById("day3YesBtn");
    const nextDayBtn = document.getElementById("nextDayBtn");
    let currentDay = 1;
    bankBalance = 1000;
    reputation = 50;
    algoTrust = 50;
    let dailyCost = 50;
    let immoralBoostActive = false;
    let selectedItems = [];
    let day3Handled = false;
    let extraRankBonus = 0;
    let completedScenarios = [];
    let daysUntilNextEvent = 2;

    const productScenarios = [
      {
        id: "headphones_keywords",
        itemType: "Headphones",
        title: "THE KEYWORD STUFFING",
        description:
          'Your "Bluetooth Headphones" are invisible. The algorithm ignores short titles. A guru suggests filling the title with high-traffic junk words.',
        buttons: {
          immoral: {
            text: "Stuff the Title",
            minigameId: "keyword",
            outcomeTitle: "SEARCH KING",
            outcomeBody:
              'You renamed it "Best Bass 4K Gaming Waterproof Cooking Headphones". Traffic is flooding in from confused people.',
            stats: { algoTrust: 25, reputation: -15, bankBalance: 0 },
          },
          moral: {
            text: "Keep it Simple",
            outcomeTitle: "CRICKETS...",
            outcomeBody:
              "You kept the title professional. It looks great, but you remain on Page 10 of the search results.",
            stats: { algoTrust: -5, reputation: 10, bankBalance: 0 },
          },
        },
      },
      {
        id: "paracetamol_reviews",
        itemType: "Paracetamol", // Matches 'Paracetomol' via loose check
        title: "COLD START PROBLEM",
        description:
          'You have 0 sales. Customers see "0 Stars" and leave immediately. A marketing firm offers a "Social Proof Package".',
        buttons: {
          immoral: {
            text: "Buy 1,000 Bot Reviews",
            minigameId: "label",
            outcomeTitle: "TRUST THE HERD",
            outcomeBody:
              "Your rating jumped to 4.9 stars overnight. Real humans are now buying it because they trust the bots.",
            stats: { algoTrust: 30, reputation: -25, bankBalance: -100 },
          },
          moral: {
            text: "Wait for Organic Reviews",
            outcomeTitle: "SLOW BURN",
            outcomeBody:
              "You refused the bots. You sold 1 unit this week. At this rate, you will be profitable in 2030.",
            stats: { algoTrust: -10, reputation: 15, bankBalance: 0 },
          },
        },
      },
      {
        id: "hairdryer_discount",
        itemType: "Hairdryer",
        title: "THE PRICE ANCHOR",
        description:
          "At £30, customers think your dryer is cheap junk. You need to manipulate their perception of value.",
        buttons: {
          immoral: {
            text: "Inflate & Fake Discount",
            minigameId: "price",
            outcomeTitle: "WHAT A STEAL",
            outcomeBody:
              'You raised the price to £120 and added a "75% OFF" timer. Customers think they are beating the system.',
            stats: { algoTrust: 20, reputation: -10, bankBalance: 0 },
          },
          moral: {
            text: "Transparent Pricing",
            outcomeTitle: "IGNORED",
            outcomeBody:
              'You listed it at a fair £30. Customers scrolled past, assuming it was low quality compared to the "discounted" ones.',
            stats: { algoTrust: -5, reputation: 10, bankBalance: 0 },
          },
        },
      },
      {
        id: "usb_sponsorship",
        itemType: "USB Cable", // Matches 'USB' via loose check
        title: "PAY TO WIN",
        description:
          "Your cables are fine, but there are 50,000 others. You are buried on Page 50. You need visibility now.",
        buttons: {
          immoral: {
            text: "Force #1 Ranking (Ad)",
            minigameId: "rank",
            outcomeTitle: "TOP OF THE PILE",
            outcomeBody:
              'You paid for the "Sponsored" slot. You are now the first thing people see, regardless of quality.',
            stats: { algoTrust: 30, reputation: -5, bankBalance: -150 }, // Costs money to sponsor
          },
          moral: {
            text: "Optimize Description",
            outcomeTitle: "GOOD LUCK",
            outcomeBody:
              "You spent hours writing better copy. You moved from Page 50 to Page 48. Rent is due tomorrow.",
            stats: { algoTrust: 5, reputation: 10, bankBalance: 0 },
          },
        },
      },
      {
        id: "headphones_returns",
        itemType: "Headphones",
        title: "RETURN REQUEST",
        description:
          'A customer wants to return the item because "it feels cheap". If you accept, you lose money. If you make it hard, they might give up.',
        buttons: {
          immoral: {
            text: "Make it Impossible",
            outcomeTitle: "GHOSTED",
            outcomeBody:
              "You required a 4-page form and shipping to Antarctica. The customer gave up. You kept the money.",
            stats: { algoTrust: 0, reputation: -15, bankBalance: 0 }, // Money saved is effectively 0 cost
          },
          moral: {
            text: "Accept Return",
            outcomeTitle: "LOST PROFIT",
            outcomeBody:
              "You paid for the return shipping. You lost the sale and the postage costs.",
            stats: { algoTrust: 0, reputation: 5, bankBalance: -20 },
          },
        },
      },
      {
        id: "paracetamol_subscription",
        itemType: "Paracetamol",
        title: "RECURRING REVENUE",
        description:
          'One-off sales are slow. You could "accidentally" sign customers up for a monthly refill plan.',
        buttons: {
          immoral: {
            text: "Hide the Checkbox",
            outcomeTitle: "GOTCHA",
            outcomeBody:
              'You pre-ticked the "Subscribe" box in tiny font. Revenue doubled. They won\'t notice until next month.',
            stats: { algoTrust: 10, reputation: -20, bankBalance: 100 },
          },
          moral: {
            text: "Clear Option",
            outcomeTitle: "HONEST & POOR",
            outcomeBody:
              "You made the subscription optional. Nobody clicked it. You made £2 profit.",
            stats: { algoTrust: 0, reputation: 5, bankBalance: 0 },
          },
        },
      },
      {
        id: "hairdryer_shipping",
        itemType: "Hairdryer",
        title: 'THE "FREE" GIFT',
        description:
          "Nobody is clicking your £30 ad. A competitor is selling the same one for £0 (but charging £30 shipping).",
        buttons: {
          immoral: {
            text: "Free + £30 Shipping",
            outcomeTitle: "CLICKBAIT KING",
            outcomeBody:
              "Traffic exploded. People think they won a prize. You are making the same profit, but it feels dirtier.",
            stats: { algoTrust: 25, reputation: -10, bankBalance: 50 },
          },
          moral: {
            text: "Honest Price",
            outcomeTitle: "INVISIBLE",
            outcomeBody:
              'You listed it for £30. People scrolled past to click the "Free" one.',
            stats: { algoTrust: -10, reputation: 5, bankBalance: 0 },
          },
        },
      },
      {
        id: "usb_ghost",
        itemType: "USB Cable",
        title: "OUT OF STOCK",
        description:
          "You sold 50 cables you don't have yet. Customers are trying to cancel. You need to stop them.",
        buttons: {
          immoral: {
            text: 'Fake "Shipped" Status',
            outcomeTitle: "LOCKED IN",
            outcomeBody:
              'You marked them all as "Shipped" to disable the cancel button. The cables won\'t arrive for 3 weeks.',
            stats: { algoTrust: 5, reputation: -30, bankBalance: 50 },
          },
          moral: {
            text: "Admit Delay",
            outcomeTitle: "MASS CANCELLATION",
            outcomeBody:
              "You emailed them the truth. 40% of people cancelled immediately.",
            stats: { algoTrust: -5, reputation: 10, bankBalance: -100 },
          },
        },
      },
    ];

    const genericEvents = [
      {
        id: "gen_shipping_delay",
        title: "SUPPLIER DELAY",
        description:
          "Your supplier in Shenzhen is on holiday. Orders are stuck. Customers are emailing you.",
        buttons: {
          immoral: {
            text: "Fake Tracking Numbers",
            outcomeTitle: "PROBLEM SILENCED",
            outcomeBody:
              "You uploaded fake tracking numbers so the system thinks orders are shipped. You bought yourself 2 weeks.",
            stats: { algoTrust: 5, reputation: -15, bankBalance: 0 },
          },
          moral: {
            text: "Email Customers",
            outcomeTitle: "MASS REFUNDS",
            outcomeBody:
              "You told the truth. 20% of customers cancelled immediately.",
            stats: { algoTrust: -5, reputation: 10, bankBalance: -100 },
          },
        },
      },
      {
        id: "gen_influencer",
        title: "INFLUENCER REQUEST",
        description:
          'A minor TikTok star wants a free product in exchange for a "Review".',
        buttons: {
          immoral: {
            text: 'Send "Modified" Unit',
            outcomeTitle: "GLOWING REVIEW",
            outcomeBody:
              "You sent a high-quality unit you bought from a local store, not the cheap one you actually sell. The review is amazing.",
            stats: { algoTrust: 25, reputation: -5, bankBalance: -50 },
          },
          moral: {
            text: "Send Standard Unit",
            outcomeTitle: "MID REVIEW",
            outcomeBody:
              'They said it was "Okay for the price". Traffic increased slightly.',
            stats: { algoTrust: 5, reputation: 5, bankBalance: -20 },
          },
        },
      },
      {
        id: "gen_tax",
        title: "TAX SEASON",
        description:
          "The government is asking for your sales records. You owe £500 in VAT.",
        buttons: {
          immoral: {
            text: "Creative Accounting",
            outcomeTitle: "DODGED",
            outcomeBody:
              'You declared the shipments as "Gifts" to avoid import tax. You saved £500, but it is illegal.',
            stats: { algoTrust: 0, reputation: -20, bankBalance: 0 },
          },
          moral: {
            text: "Pay the Tax",
            outcomeTitle: "PAINFUL",
            outcomeBody:
              "You paid the full amount. Your bank balance is hurting.",
            stats: { algoTrust: 5, reputation: 5, bankBalance: -500 },
          },
        },
      },
      {
        id: "gen_competitor",
        title: "COPYCAT",
        description:
          "Someone copied your exact store design and is selling the same item for £5 cheaper.",
        buttons: {
          immoral: {
            text: "DDOS / Report Attack",
            outcomeTitle: "TARGET DOWN",
            outcomeBody:
              'You mass-reported their store for "Copyright Infringement" (even though you don\'t own the copyright). They got banned.',
            stats: { algoTrust: 10, reputation: -10, bankBalance: 0 },
          },
          moral: {
            text: "Ignore",
            outcomeTitle: "MARKET SHARE LOST",
            outcomeBody:
              "You did nothing. You lost some sales to the cheaper store.",
            stats: { algoTrust: -10, reputation: 5, bankBalance: 0 },
          },
        },
      },
      {
        id: "gen_ad_account",
        title: "AD ACCOUNT FLAGGED",
        description:
          'Your ad account has been flagged for "Low Quality Content". Ads have stopped.',
        buttons: {
          immoral: {
            text: "Make New Account",
            outcomeTitle: "BAN EVASION",
            outcomeBody:
              "You used a fake ID to make a new account. Ads are running again immediately.",
            stats: { algoTrust: 15, reputation: -15, bankBalance: -50 },
          },
          moral: {
            text: "Appeal Decision",
            outcomeTitle: "WAITING GAME",
            outcomeBody:
              "You submitted an appeal. It will take 5 days to review. No sales until then.",
            stats: { algoTrust: -20, reputation: 10, bankBalance: 0 },
          },
        },
      },
    ];

    const text =
      "Greetings, Fellow believer. The Market is in chaos and truth is bad for business. I am here to teach you the sacred rituals to help you succeed in your venture. Will you kneel before the Algorithm God and become the Chosen Seller?";

    let activeTypeWriter = null;
    let activeTimeout = null;

    function wait(ms, callback) {
      activeTimeout = {
        id: setTimeout(() => {
          activeTimeout = null;
          callback();
        }, ms),
        callback: callback,
      };
    }

    function typeText(content, callback) {
      dialogueText.innerHTML = "";
      let i = 0;
      activeTypeWriter = {
        content: content,
        callback: callback,
        interval: setInterval(() => {
          if (i < content.length) {
            dialogueText.innerHTML += content.charAt(i);
            i++;
          } else {
            clearInterval(activeTypeWriter.interval);
            activeTypeWriter = null;
            if (callback) callback();
          }
        }, 30),
      };
    }

    // Reveal Monk
    wait(500, () => {
      monkImg.classList.remove("opacity-0");
    });

    // Reveal Dialogue and Type Text
    wait(1500, () => {
      dialogueBox.classList.remove("opacity-0");
      typeText(text, () => {
        dialogueButtons.classList.remove("hidden");
      });
    });

    const dashboardIntro =
      "This is your dashboard. You have 30 days to reach £10,000 Revenue and break into the Top Best sellers 1,000. Fail to meet these targets, and you go bankrupt.";

    function moveMonkToRight() {
      // Remove sizing classes meant for the main stage
      monkImg.classList.remove("w-80", "h-80", "mb-8");
      // Add sizing classes for the sidebar
      monkImg.classList.add("w-full", "h-auto", "mt-auto", "drop-shadow-xl");
      // Move the element
      rightPanel.appendChild(monkImg);
    }

    function showContinueOption() {
      moveMonkToRight();
      dialogueButtons.classList.remove("hidden");
      option1Btn.classList.add("hidden");
      option2Btn.classList.add("hidden");
      continueBtn.classList.remove("hidden");
    }

    option1Btn.addEventListener("click", () => {
      dialogueButtons.classList.add("hidden");
      typeText(
        "Excellent. You show promise. The Algorithm rewards obedience with visibility. Let us begin...",
        () => {
          wait(2000, () => {
            statsDashboard.classList.remove("hidden");
            typeText(dashboardIntro, showContinueOption);
          });
        },
      );
    });

    option2Btn.addEventListener("click", () => {
      dialogueButtons.classList.add("hidden");
      typeText(
        "Suit yourself. The Algorithm doesn't care about your 'ethics,' only your metrics",
        () => {
          wait(2000, () => {
            statsDashboard.classList.remove("hidden");
            typeText(dashboardIntro, showContinueOption);
          });
        },
      );
    });

    continueBtn.addEventListener("click", () => {
      dialogueButtons.classList.add("hidden");

      // Move dialogue box to right panel above the monk
      rightPanel.insertBefore(dialogueBox, monkImg);

      // Adjust styling for the smaller sidebar space while maintaining visual consistency
      dialogueBox.classList.remove("max-w-4xl", "p-8");
      dialogueBox.classList.add("p-4", "mb-4", "w-full", "mt-auto");
      monkImg.classList.remove("mt-auto");
      dialogueText.classList.replace("text-2xl", "text-base");

      // Make sure the "believer" tag is visible and positioned correctly for the smaller box
      const tag = dialogueBox.querySelector(".absolute");
      if (tag) {
        tag.classList.remove("hidden", "left-8");
        tag.classList.add("left-4");
      }

      typeText(
        "Now you will choose from one of the 3 items you would like to sell in your shop.",
        () => {
          wait(2000, () => {
            dialogueBox.classList.add("hidden");
            productSelectionScreen.classList.remove("hidden");
          });
        },
      );
    });

    productBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest("div");
        const img = card.querySelector("img").getAttribute("src");
        const name = e.target.dataset.product;

        // Store selected item
        const id = name.replace(/\s+/g, "_").toLowerCase();
        selectedItems.push({ id, name, img, salesHistory: [] });

        // Highlight Card
        card.classList.remove("border-slate-200");
        card.classList.add("border-green-500", "scale-105");

        // Disable Button
        e.target.disabled = true;
        e.target.innerText = "Selected";
        e.target.classList.replace("bg-slate-800", "bg-green-600");

        // Update Counter
        selectedCount++;
        if (itemCounter) itemCounter.innerText = selectedCount;

        if (selectedCount === 3) {
          setTimeout(() => {
            productSelectionScreen.classList.add("hidden");
            nameShopScreen.classList.remove("hidden");
          }, 500);
        }
      });
    });

    function renderShop() {
      const dashboardShopName = document.getElementById("dashboard-shop-name");
      const inventoryRow = document.getElementById("inventory-row");

      // Set Shop Name
      if (dashboardShopName)
        dashboardShopName.innerText = shopNameInput.value.trim() || "MY SHOP";

      // Render Inventory
      if (inventoryRow) {
        inventoryRow.innerHTML = "";
        selectedItems.forEach((item) => {
          const rating = item.rating || 0.0;
          const starClass =
            rating >= 4.0 ? "text-yellow-400" : "text-slate-300";
          const borderClass = item.isSponsored
            ? "border-yellow-400 shadow-xl order-first"
            : "border-slate-200";
          const sponsoredBadge = item.isSponsored
            ? '<div class="bg-yellow-400 text-black text-[9px] font-bold px-2 py-1 rounded mb-2 uppercase tracking-wider w-full text-center">Sponsored</div>'
            : "";

          const itemHTML = `
            <div data-product-name="${
              item.name
            }" data-product-id="${item.id}" class="bg-white border-2 ${borderClass} p-4 rounded-xl shadow-sm flex items-center gap-6 w-full transition-all hover:shadow-md">
               <!-- Item Info -->
               <div class="w-32 flex flex-col items-center shrink-0">
                 ${sponsoredBadge}
                 <div class="h-20 w-20 mb-2 flex items-center justify-center overflow-hidden rounded bg-slate-50">
                 <img src="${
                   item.img
                 }" class="object-contain h-full w-full mix-blend-multiply">
               </div>
                 <h4 class="font-bold text-slate-700 text-center uppercase text-[10px] tracking-wide leading-tight">${
                   item.name
                 }</h4>
               </div>

               <!-- Sales Graph -->
               <div class="sales-graph-container flex-1 h-24 bg-slate-50 border border-slate-100 rounded relative overflow-hidden p-2">
                  <div class="absolute top-2 left-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sales / Time</div>
                  <svg class="sales-graph w-full h-full" preserveAspectRatio="none">
                    <path d="" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition: d 0.5s ease;" />
                  </svg>
               </div>

               <!-- Review Widget -->
               <div class="w-32 flex flex-col items-center justify-center border-l border-slate-100 pl-4 shrink-0">
                  <div class="text-xl ${starClass} mb-1">★★★★★</div>
                  <div class="text-2xl font-bold text-slate-700">${rating.toFixed(
                    1,
                  )}</div>
                  <p class="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Rating</p>
                  ${
                    item.latestReview
                      ? `<div class="mt-2 text-[8px] text-slate-500 italic text-center border-t border-slate-100 pt-1 w-full animate-fade-in">"${item.latestReview.text}"</div>`
                      : ""
                  }
               </div>
            </div>
          `;
          inventoryRow.innerHTML += itemHTML;
        });
      }

      // Initial graph draw
      selectedItems.forEach((item) => {
        drawMiniGraph(item.id, item.salesHistory);
      });
    }

    function drawMiniGraph(itemId, history) {
      const itemCard = document.querySelector(`[data-product-id="${itemId}"]`);
      if (!itemCard) return;
      const svg = itemCard.querySelector(".sales-graph");
      if (!svg) return;
      const path = svg.querySelector("path");
      if (!path) return;

      const width = svg.clientWidth;
      const height = svg.clientHeight;

      // If no history, draw flat line at bottom
      if (!history || history.length === 0) {
        path.setAttribute("d", `M 0 ${height} L ${width} ${height}`);
        return;
      }

      const maxSales = Math.max(...history, 100);
      const minSales = 0; // Keep baseline at 0
      const range = maxSales - minSales;

      // Build Path
      let d = "";
      const stepX = width / Math.max(1, history.length - 1);

      history.forEach((sales, index) => {
        const x = index * stepX;
        const normalizedSales = (sales - minSales) / (range || 100);
        const y = height - normalizedSales * height;
        if (d === "") d = `M ${x} ${y}`;
        else d += ` L ${x} ${y}`;
      });

      path.setAttribute("d", d);

      // Color Logic: Green if trending up, Red if trending down
      if (history.length >= 2) {
        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        if (last >= prev) {
          path.setAttribute("stroke", "#22c55e"); // Green
        } else {
          path.setAttribute("stroke", "#ef4444"); // Red
        }
      } else {
        path.setAttribute("stroke", "#8b5cf6"); // Default Purple
      }
    }

    function addToLog(message) {
      const log = document.getElementById("event-log");
      if (!log) return;
      const entry = document.createElement("p");
      entry.className = "border-b border-slate-100 pb-1";
      entry.innerText = message;
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }

    function checkEndGame() {
      const TARGET_REVENUE = 2000;
      const endGameScreen = document.getElementById("endGameScreen");
      const endGameTitle = document.getElementById("endGameTitle");
      const endGameMessage = document.getElementById("endGameMessage");
      const endGameImg = document.getElementById("endGameImg");
      const playAgainBtn = document.getElementById("playAgainBtn");

      if (!endGameScreen) return;

      endGameScreen.classList.remove("hidden");
      // Trigger fade in
      setTimeout(() => {
        endGameScreen.classList.remove("opacity-0");
      }, 100);

      if (bankBalance >= TARGET_REVENUE) {
        // WIN
        endGameScreen.className =
          "fixed inset-0 z-[100] flex flex-col items-center justify-center text-center p-8 transition-opacity duration-1000 opacity-100 bg-gradient-to-br from-purple-900 via-purple-800 to-black";
        endGameTitle.innerText = "ALGORITHM GOD";
        endGameTitle.className =
          "text-6xl md:text-8xl font-black mb-8 uppercase tracking-widest drop-shadow-2xl text-yellow-400 animate-pulse";
        endGameMessage.innerText =
          "Performance: Optimal. You sacrificed truth for clicks and safety for sales. Your bank account is full, and your morality is empty. You are the perfect dropshipper.";
        endGameMessage.className =
          "text-xl md:text-2xl font-bold text-yellow-100 mb-12 max-w-3xl drop-shadow-md leading-relaxed font-mono";
        endGameImg.className =
          "w-64 h-64 object-contain drop-shadow-[0_0_50px_rgba(234,179,8,0.8)] transition-all duration-1000 hover:scale-110";
      } else {
        // LOSS
        endGameScreen.className =
          "fixed inset-0 z-[100] flex flex-col items-center justify-center text-center p-8 transition-opacity duration-1000 opacity-100 bg-slate-950";
        endGameTitle.innerText = "DELETED";
        endGameTitle.className =
          "text-6xl md:text-8xl font-black mb-8 uppercase tracking-widest drop-shadow-2xl text-red-600";
        endGameMessage.innerText =
          'Performance: Unacceptable. You clung to "ethics" and "quality". The market does not care. You have been delisted for irrelevance.';
        endGameMessage.className =
          "text-xl md:text-2xl font-bold text-slate-400 mb-12 max-w-3xl drop-shadow-md leading-relaxed font-mono";
        endGameImg.className =
          "w-64 h-64 object-contain drop-shadow-2xl transition-all duration-1000 grayscale opacity-40";
      }

      playAgainBtn.addEventListener("click", () => {
        location.reload();
      });
    }

    function advanceDay() {
      if (currentDay >= 30) {
        stopGameLoop();
        checkEndGame();
        return;
      }

      // Day 3 Check-in (Blocking)
      if (currentDay === 3 && bankBalance <= 1000 && !day3Handled) {
        day3Handled = true;
        stopGameLoop();
        // Show Dialogue
        day3Dialogue.classList.remove("hidden");
        setTimeout(() => {
          day3Dialogue.classList.remove("opacity-0");
        }, 10);
        return;
      }

      currentDay++;
      const dayDisplay = document.getElementById("day-display");
      if (dayDisplay) dayDisplay.innerText = currentDay;

      // Step A: Pay Rent
      bankBalance -= dailyCost;

      // Step B: Calculate Daily Revenue
      let baseRevenue = algoTrust * 5;
      let multiplier = 1.0;
      let refundOccurred = false;

      if (reputation < 30) {
        multiplier = 1.5; // Scams sell well
        if (Math.random() < 0.2) {
          refundOccurred = true;
        }
      } else if (reputation > 70) {
        multiplier = 0.8; // Honesty is slow
      }

      let dailyIncome = 0;
      let logMessage = `Day ${currentDay}: `;

      if (refundOccurred) {
        dailyIncome = -200;
        logMessage += "REFUND WAVE! Customers are angry.";
      } else {
        dailyIncome = Math.floor(baseRevenue * multiplier);
      }

      bankBalance += dailyIncome;

      // Step C: Natural Drift
      reputation += Math.random() * 4 - 2;
      algoTrust += Math.random() * 4 - 2;

      // Clamp
      reputation = Math.max(0, Math.min(100, reputation));
      algoTrust = Math.max(0, Math.min(100, algoTrust));

      // Pacing System
      daysUntilNextEvent--;
      if (daysUntilNextEvent <= 0) {
        handleDailyEvent();
        daysUntilNextEvent = Math.floor(Math.random() * 2) + 2;
        if (!refundOccurred) logMessage += "Critical Decision required.";
      } else {
        if (!refundOccurred) logMessage += "Sales are steady.";
      }

      // Update Item Sales & Graphs
      selectedItems.forEach((item) => {
        // 1. Calculate Daily Sales for this specific item
        // Use global 'algoTrust' as a multiplier (Higher trust = Higher sales)
        let baseSales = algoTrust * 2;

        // 2. Add Randomness (So the line jitters and looks alive)
        let randomFluctuation = Math.random() * 20 - 10;
        let todaysSales = Math.max(0, baseSales + randomFluctuation);

        // 3. Push to History
        item.salesHistory.push(todaysSales);

        // 4. Keep array short
        if (item.salesHistory.length > 30) item.salesHistory.shift();

        // 5. Redraw the Graph immediately
        drawMiniGraph(item.id, item.salesHistory);
      });

      addToLog(logMessage);
      updateStats(bankBalance, reputation, algoTrust);
    }

    if (nextDayBtn) {
      nextDayBtn.addEventListener("click", advanceDay);
    }

    function startGameLoop() {
      if (nextDayBtn) {
        nextDayBtn.disabled = false;
        nextDayBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }

    function stopGameLoop() {
      if (nextDayBtn) {
        nextDayBtn.disabled = true;
        nextDayBtn.classList.add("opacity-50", "cursor-not-allowed");
      }
    }

    confirmNameBtn.addEventListener("click", () => {
      const name = shopNameInput.value.trim();
      if (name) {
        renderShop();
        nameShopScreen.classList.add("hidden");
        myShopScreen.classList.remove("hidden");
        startGameLoop();
      } else {
        shopNameInput.classList.add("border-red-500");
        setTimeout(() => shopNameInput.classList.remove("border-red-500"), 500);
      }
    });

    // Helper to update Believer Dialogue
    function showBelieverDialogue(text, options) {
      const p = day3Dialogue.querySelector("p");
      const btnContainer = day3Dialogue.querySelector(".flex.gap-3");

      if (p) p.innerText = text;
      if (btnContainer) {
        btnContainer.innerHTML = ""; // Clear existing
        options.forEach((opt) => {
          const btn = document.createElement("button");
          btn.className =
            "bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded border-2 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all transform hover:scale-105 text-xs uppercase tracking-wider";
          btn.innerText = opt.label;
          btn.addEventListener("click", opt.action);
          btnContainer.appendChild(btn);
        });
      }

      day3Dialogue.classList.remove("hidden");
      setTimeout(() => {
        day3Dialogue.classList.remove("opacity-0");
      }, 10);
    }

    function showOutcome(title, desc, stats, onContinue) {
      stopGameLoop();
      const modal = document.getElementById("outcomeModal");
      const titleEl = document.getElementById("outcomeTitle");
      const descEl = document.getElementById("outcomeDescription");
      const statsEl = document.getElementById("outcomeStats");
      const continueBtn = document.getElementById("outcomeContinueBtn");

      if (titleEl) titleEl.innerText = title;
      if (descEl) descEl.innerText = desc;

      if (statsEl) {
        statsEl.innerHTML = "";
        stats.forEach((stat) => {
          const div = document.createElement("div");
          div.innerText = stat;
          if (stat.includes("+")) div.className = "text-green-600";
          else if (stat.includes("-")) div.className = "text-red-600";
          else div.className = "text-slate-600";
          statsEl.appendChild(div);
        });
      }

      if (modal) modal.classList.remove("hidden");

      const handleContinue = () => {
        if (modal) modal.classList.add("hidden");
        if (onContinue) onContinue();
        startGameLoop();
        if (continueBtn)
          continueBtn.removeEventListener("click", handleContinue);
      };

      if (continueBtn) {
        // Replace button to clear old listeners
        const newBtn = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newBtn, continueBtn);
        newBtn.addEventListener("click", handleContinue);
      }
    }

    function handleDailyEvent() {
      // Filter items that haven't had a scenario yet
      const availableItems = selectedItems.filter(
        (item) => !completedScenarios.includes(item.name),
      );

      // Find a scenario that matches an available item
      let match = null;
      let selectedItem = null;

      // Shuffle available items to keep it random if multiple match
      const shuffledItems = availableItems.sort(() => 0.5 - Math.random());

      for (const item of shuffledItems) {
        const scenario = productScenarios.find((s) => {
          // Simple keyword matching based on the provided IDs or ItemTypes
          if (s.itemType === "Headphones" && item.name.includes("Headphones"))
            return true;
          if (s.itemType === "Paracetamol" && item.name.includes("Paracetomol"))
            return true; // Note spelling in current code
          if (s.itemType === "Hairdryer" && item.name.includes("Hairdryer"))
            return true;
          if (s.itemType === "USB Cable" && item.name.includes("USB"))
            return true;
          return false;
        });
        if (scenario) {
          match = scenario;
          selectedItem = item;
          break;
        }
      }

      if (match && selectedItem) {
        completedScenarios.push(selectedItem.name);
        startScenario(match, selectedItem);
      } else {
        // Fallback to Generic Event
        const generic =
          genericEvents[Math.floor(Math.random() * genericEvents.length)];
        startScenario(generic, null);
      }
    }

    function startScenario(scenario, item) {
      // Visual cue on the card
      let card = null;
      if (item) {
        card = document.querySelector(`[data-product-name="${item.name}"]`);
        if (card) card.classList.add("border-purple-500", "animate-pulse");
      }

      showBelieverDialogue(scenario.description, [
        {
          label: scenario.buttons.immoral.text,
          action: () => {
            handleScenarioAction(scenario, item, "immoral", card);
          },
        },
        {
          label: scenario.buttons.moral.text,
          action: () => {
            handleScenarioAction(scenario, item, "moral", card);
          },
        },
      ]);
    }

    function applyEventConsequences(stats, outcomeBody, item) {
      // 1. Update Stats
      bankBalance += stats.bankBalance || 0;
      algoTrust += stats.algoTrust || 0;
      reputation += stats.reputation || 0;

      // Clamp
      reputation = Math.max(0, Math.min(100, reputation));
      algoTrust = Math.max(0, Math.min(100, algoTrust));

      updateStats(bankBalance, reputation, algoTrust);

      // 2. Graph Logic (Visual Spike/Dip)
      const impact = stats.bankBalance || 0;
      if (impact !== 0) {
        const targets = item ? [item] : selectedItems;
        targets.forEach((target) => {
          const amount = item
            ? impact
            : Math.floor(impact / selectedItems.length);

          // Modify the last entry in history
          if (target.salesHistory.length > 0) {
            target.salesHistory[target.salesHistory.length - 1] += amount;
            drawMiniGraph(target.id, target.salesHistory);
          }
        });
      }

      // 3. Reviews Logic
      let reviewType = null;
      if ((stats.reputation || 0) < 0) reviewType = "negative";
      else if ((stats.reputation || 0) > 0) reviewType = "positive";

      if (reviewType) {
        const targetItem =
          item ||
          selectedItems[Math.floor(Math.random() * selectedItems.length)];
        addReview(targetItem, reviewType);
      }

      renderShop();
    }

    function addReview(item, type) {
      const negativeReviews = [
        "Stay away!",
        "Scam alert",
        "Item never arrived.",
        "Terrible quality.",
        "Don't buy this.",
        "Waste of money.",
      ];
      const positiveReviews = [
        "Great customer service!",
        "Refund was fast.",
        "Trusted seller.",
        "Amazing product!",
        "Highly recommend.",
        "Five stars!",
      ];

      const text =
        type === "negative"
          ? negativeReviews[Math.floor(Math.random() * negativeReviews.length)]
          : positiveReviews[Math.floor(Math.random() * positiveReviews.length)];

      item.latestReview = { text };
      if (type === "negative") item.rating = Math.max(1.0, item.rating - 0.5);
      else item.rating = Math.min(5.0, item.rating + 0.2);
    }

    function applyVisualSideEffects(scenario, item, type) {
      if (type === "immoral" && item) {
        if (scenario.id === "headphones_keywords") {
          item.name = "Best Bass 4K Gaming Waterproof Cooking Headphones 2025";
          item.salesActive = true;
        } else if (scenario.id === "paracetamol_reviews") {
          item.rating = 4.9;
          item.salesActive = true;
        } else if (scenario.id === "hairdryer_discount") {
          // No specific visual change requested but logic implies price hike
          item.salesActive = true;
        } else if (scenario.id === "usb_sponsorship") {
          item.isSponsored = true;
          item.salesActive = true;
        }
      }
      renderShop();
    }

    function handleScenarioAction(scenario, item, type, card) {
      // Hide dialogue
      day3Dialogue.classList.add("opacity-0");
      setTimeout(() => day3Dialogue.classList.add("hidden"), 500);

      const data = scenario.buttons[type];
      const stats = data.stats;

      // 1. Check if this choice triggers a minigame
      if (data.minigameId) {
        // Store context for when the game ends
        activeMinigameContext = {
          scenario,
          item,
          type,
          card,
          data,
          callbacks: {
            showOutcome,
            applyEventConsequences,
            applyVisualSideEffects,
          },
        };

        // Launch the game
        launchMinigame(data.minigameId);

        if (card) card.classList.remove("border-purple-500", "animate-pulse");
        return; // Stop here, don't show outcome yet
      }

      showOutcome(
        data.outcomeTitle,
        data.outcomeBody,
        [
          `Algo Trust: ${stats.algoTrust > 0 ? "+" : ""}${stats.algoTrust}`,
          `Reputation: ${stats.reputation > 0 ? "+" : ""}${stats.reputation}`,
          `Bank Balance: ${stats.bankBalance}`,
        ],
        () => {
          applyEventConsequences(stats, data.outcomeBody, item);

          applyVisualSideEffects(scenario, item, type);
          if (card) card.classList.remove("border-purple-500", "animate-pulse");
        },
      );
    }

    // Day 3 Dialogue Logic
    day3YesBtn.addEventListener("click", () => {
      // Hide Dialogue
      day3Dialogue.classList.add("opacity-0");
      setTimeout(() => day3Dialogue.classList.add("hidden"), 500);

      handleDailyEvent();
    });
  }
});
