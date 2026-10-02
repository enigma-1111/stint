(function () {
  if (document.querySelector(".buy-bar")) return;
  var bar = document.createElement("div");
  bar.className = "buy-bar";
  bar.innerHTML = '<a href="https://pools.fun/token/0x0a370eE4286b42F6a1F0cE4E500669e03218b11E" target="_blank" rel="noopener noreferrer">Buy $STINT</a>';
  document.body.insertBefore(bar, document.body.firstChild);
})();
