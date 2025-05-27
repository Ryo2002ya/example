document.addEventListener("DOMContentLoaded", function() {
  let csvData = [
    { Date: "2024-01-01", FundA: 0.01, FundB: 0.015, FundC: -0.005 },
    { Date: "2024-01-02", FundA: 0.012, FundB: 0.017, FundC: -0.002 },
    { Date: "2024-01-03", FundA: -0.008, FundB: 0.01, FundC: 0.003 },
    // ...（実際のデータをここに追加）
  ];
  let funds = Object.keys(csvData).filter(key => key !== "Date");

  function updateTargetFundSelect() {
    targetFundSelect.innerHTML = "";
    funds.forEach(fund => {
      let option = document.createElement("option");
      option.value = fund;
      option.textContent = fund;
      targetFundSelect.appendChild(option);
    });
  }

  updateTargetFundSelect();

  function processCSV(file) {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function(results) {
        csvData = results.data.filter(row => Object.keys(row).length > 1);
        funds = Object.keys(csvData).filter(key => key !== "Date");
        updateTargetFundSelect();
      },
      error: function(error) {
        console.error("CSVパースエラー:", error);
      }
    });
  }

  function processExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames;
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headers = jsonData;  
      csvData = jsonData.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      funds = headers.filter(key => key !== "Date");
      updateTargetFundSelect();
    };

    reader.readAsArrayBuffer(file);
  }

  function computeMean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function computeVariance(arr, mean) {
    return arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length;
  }

  function computeCovariance(arr1, mean1, arr2, mean2) {
    return arr1.reduce((sum, val, i) => sum + (val - mean1) * (arr2[i] - mean2), 0) / arr1.length;
  }

  calcButton.addEventListener("click", function() {
    if (!csvData) {
      alert("CSVまたはExcelファイルがアップロードされていません。");
      return;
    }
    
    let targetFund = targetFundSelect.value;
    if (!targetFund) {
      alert("ターゲットファンドを選択してください。");
      return;
    }
    
    let currentHolding = parseFloat(document.getElementById("currentHolding").value);
    let extraFunds = parseFloat(document.getElementById("extraFunds").value);
    if(isNaN(currentHolding) || isNaN(extraFunds)) {
      alert("現在の保有額または追加投資額を正しく入力してください。");
      return;
    }
    
    let fundData = {};
    funds.forEach(fund => {
      fundData[fund] = csvData.map(row => parseFloat(row[fund])).filter(val => !isNaN(val));
    });

    let means = {};
    let variances = {};
    funds.forEach(fund => {
      let dataArr = fundData[fund];
      let mean = computeMean(dataArr);
      means[fund] = mean;
      variances[fund] = computeVariance(dataArr, mean);
    });

    let covMatrix = {};
    funds.forEach(fund1 => {
      covMatrix[fund1] = {};
      funds.forEach(fund2 => {
        covMatrix[fund1][fund2] = computeCovariance(fundData[fund1], means[fund1], fundData[fund2], means[fund2]);
      });
    });

    let results = [];
    funds.forEach(fund => {
      if (fund === targetFund) return;
      let sigmaTargetSq = variances[targetFund];
      let sigmaCandidateSq = variances[fund];
      let covTargetCandidate = covMatrix[targetFund][fund];
      
      let denominator = sigmaTargetSq + sigmaCandidateSq - 2 * covTargetCandidate;
      let wTarget = denominator !== 0 ? (sigmaCandidateSq - covTargetCandidate) / denominator : 0;
      wTarget = Math.max(0, Math.min(1, wTarget));
      let wCandidate = 1 - wTarget;

      let portReturn = wTarget * means[targetFund] + wCandidate * means[fund];
      let portVariance = (wTarget ** 2) * sigmaTargetSq + (wCandidate ** 2) * sigmaCandidateSq + 2 * wTarget * wCandidate * covTargetCandidate;
      let portRisk = Math.sqrt(portVariance);
      let sharpe = portRisk !== 0 ? portReturn / portRisk : NaN;

      results.push({ candidateFund: fund, weightTarget: wTarget, weightCandidate: wCandidate, portfolioReturn: portReturn, portfolioRisk: portRisk, sharpe: sharpe });
    });
    
    results.sort((a, b) => b.sharpe - a.sharpe);
    let bestCandidateResult = results;
    let bestCandidate = bestCandidateResult.candidateFund;
    
    let optimalWeightTarget = bestCandidateResult.weightTarget;
    
    let totalPortfolio = currentHolding + extraFunds;
    let idealTargetValue = totalPortfolio * optimalWeightTarget;
    let additionalTarget = idealTargetValue - currentHolding;
    if(additionalTarget < 0) { additionalTarget = 0; }
    let additionalCandidate = extraFunds - additionalTarget;
    
    let currentPortfolioReturn = means[targetFund];
    let currentPortfolioRisk = Math.sqrt(variances[targetFund]);
    let currentPortfolioSharpe = currentPortfolioRisk !== 0 ? currentPortfolioReturn / currentPortfolioRisk : NaN;
    
    let finalTargetValue = currentHolding + additionalTarget;
    let finalCandidateValue = additionalCandidate;
    let finalTotal = finalTargetValue + finalCandidateValue;
    let finalWeightTarget = finalTotal > 0 ? finalTargetValue / finalTotal : 0;
    let finalWeightCandidate = finalTotal > 0 ? finalCandidateValue / finalTotal : 0;
    let newPortfolioReturn = finalWeightTarget * means[targetFund] + finalWeightCandidate * means[bestCandidate];
    let newPortfolioRisk = finalWeightTarget * Math.sqrt(variances[targetFund]) + finalWeightCandidate * Math.sqrt(variances[bestCandidate]);
    let newPortfolioSharpe = newPortfolioRisk !== 0 ? newPortfolioReturn / newPortfolioRisk : NaN;
    
    let resultHTML = `<p>ターゲットファンド: <strong>${targetFund}</strong></p>`;
    resultHTML += `<p>最も効率的な組み合わせ候補: <strong>${bestCandidate}</strong></p>`;
    resultHTML += `<p>歴史的データに基づく理想比率 (ターゲット): ${(optimalWeightTarget * 100).toFixed(2)}%</p>`;
    resultHTML += `<h3>現状のポートフォリオ</h3>`;
    resultHTML += `<p>現在、${targetFund} の保有額: ${currentHolding.toLocaleString()}円 (100%対象ファンド)</p>`;
    resultHTML += `<p>期待リターン: ${currentPortfolioReturn.toFixed(4)}</p>`;
    resultHTML += `<p>リスク: ${currentPortfolioRisk.toFixed(4)}</p>`;
    resultHTML += `<p>シャープレシオ: ${currentPortfolioSharpe.toFixed(4)}</p>`;
    resultHTML += `<h3>追加投資の提案</h3>`;
    resultHTML += `<p>追加投資額: ${extraFunds.toLocaleString()}円</p>`;
    resultHTML += `<p>${targetFund} に追加投資する提案額: ${additionalTarget.toFixed(0)}円</p>`;
    resultHTML += `<p>${bestCandidate} に追加投資する提案額: ${additionalCandidate.toFixed(0)}円</p>`;
    resultHTML += `<h3>新規投資後のポートフォリオ (概算)</h3>`;
    resultHTML += `<p>ターゲットファンド比率: ${(finalWeightTarget * 100).toFixed(2)}%、${bestCandidate}比率: ${(finalWeightCandidate * 100).toFixed(2)}%</p>`;
    resultHTML += `<p>期待リターン (概算): ${newPortfolioReturn.toFixed(4)}</p>`;
    resultHTML += `<p>リスク (概算): ${newPortfolioRisk.toFixed(4)}</p>`;
    resultHTML += `<p>シャープレシオ (概算): ${newPortfolioSharpe.toFixed(4)}</p>`;
    
    resultTextDiv.innerHTML = resultHTML;
    
    let traceFrontier = {
      x: results.map(r => r.portfolioRisk),
      y: results.map(r => r.portfolioReturn),
      mode: 'lines',
      name: 'Efficient Frontier'
    };

    let traceOptimal = {
      x: [bestCandidateResult.portfolioRisk],
      y: [bestCandidateResult.portfolioReturn],
      mode: 'markers',
      marker: { color: 'red', size: 10 },
      name: 'Max Sharpe Ratio'
    };

    let traceCurrent = {
      x: [currentPortfolioRisk],
      y: [currentPortfolioReturn],
      mode: 'markers',
      marker: { color: 'blue', size: 10 },
      name: 'Current Portfolio'
    };

    let traceNew = {
      x: [newPortfolioRisk],
      y: [newPortfolioReturn],
      mode: 'markers',
      marker: { color: 'green', size: 10 },
      name: 'New Portfolio'
    };

    let layout = {
      title: '2ファンド組み合わせの効率的フロンティア',
      xaxis: { title: 'リスク（標準偏差）' },
      yaxis: { title: '期待リターン' }
    };

    Plotly.newPlot(chartDiv, [traceFrontier, traceOptimal, traceCurrent, traceNew], layout);
  });
});
