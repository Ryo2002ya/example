<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ファンド効率的フロンティア計算プログラム</title>
  <link rel="stylesheet" href="styles.css">
  <!-- Plotly と PapaParse の CDN -->
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js"></script>
</head>
<body>
  <header>
    <h1>ファンド効率的フロンティア計算プログラム</h1>
  </header>
  <main>
    <section id="instructions">
      <p>
        仮データ CSV をアップロードしてください。<br>
        CSV は 1 列目に「Date」列、その後に各ファンドの月次リターン（例："AYD", "GLB", など）が含まれている形式です。
      </p>
    </section>
    <section id="upload-section">
      <input type="file" id="csvFileInput" accept=".csv">
    </section>
    <section id="target-section">
      <label for="targetFundSelect">ターゲットファンド:</label>
      <select id="targetFundSelect">
        <option value="">--CSVをアップロードしてください--</option>
      </select>
    </section>
    <section id="calc-section">
      <button id="calcButton">計算開始</button>
    </section>
    <section id="results">
      <h2>計算結果</h2>
      <div id="resultText"></div>
    </section>
    <section id="chart">
      <h2>効率的フロンティア</h2>
      <div id="frontierChart"></div>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>
