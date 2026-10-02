(function () {
  if (!document.querySelector(".buy-bar")) {
    if (!document.querySelector("link[href='buy-bar.css']")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "buy-bar.css";
      document.head.appendChild(link);
    }
    const bar = document.createElement("div");
    bar.className = "buy-bar";
    bar.innerHTML = '<a href="https://pools.fun/token/0x0a370eE4286b42F6a1F0cE4E500669e03218b11E" target="_blank" rel="noopener noreferrer">Buy $STINT</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  document.querySelectorAll(".rules p").forEach(function (p) {
    if (p.textContent.indexOf("If the token launches") !== -1) {
      p.innerHTML = 'Several writers can pay at once. Confirmed payments order the lines. Coming back under the same name adds another stint. Holding $STINT does not discount a line and does not pay you for writing. Pool fees, if people are trading, are claimed on the pool. That is on <a href="/token">the coin page</a>. Names live on <a href="/board">the board</a>.';
    }
  });
  const mark = document.querySelector('a[href="/token"]');
  if (mark && mark.textContent === "The mark") mark.textContent = "The coin";
})();
