// FILE: js/q4.js
// Thay thế hoàn toàn file cũ bằng file này.

(async function () {
  // --- Helpers ---
  const tryParsers = [
    d3.timeParse("%Y-%m-%d %H:%M:%S"),
    d3.timeParse("%Y-%m-%dT%H:%M:%S"),
    d3.timeParse("%d/%m/%Y %H:%M:%S"),
    d3.timeParse("%d/%m/%Y %H:%M"),
    d3.timeParse("%d/%m/%Y"),
    d3.timeParse("%Y-%m-%d")
  ];
  function parseDateFlexible(s) {
    if (!s && s !== 0) return null;
    s = String(s).trim();
    if (!s) return null;
    for (const p of tryParsers) {
      try {
        const dt = p(s);
        if (dt && !isNaN(dt)) return dt;
      } catch (e) { /*ignore*/ }
    }
    const dt2 = new Date(s);
    if (!isNaN(dt2)) return dt2;
    return null;
  }

  function toNumber(s) {
    if (s == null || s === "") return 0;
    const cleaned = String(s).replace(/[^0-9\.\-]+/g, "");
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }

  // --- Load CSV ---
  let raw;
  try {
    raw = await d3.csv("../data/data_ggsheet.csv");
  } catch (err) {
    console.error("Không thể load CSV:", err);
    d3.select("#chart").append("text").text("Không thể load data_ggsheet.csv. Hãy chạy qua HTTP server.");
    return;
  }

  // --- Normalize + parse rows ---
  const fmtYMD = d3.timeFormat("%Y-%m-%d");
  const rows = raw.map(r => {
    function findKey(obj, candidates) {
      for (const c of candidates) {
        for (const k of Object.keys(obj)) {
          if (k.trim().toLowerCase() === c.toLowerCase()) return obj[k];
        }
      }
      return undefined;
    }
    const rawDate = r["Thời gian tạo đơn"] ?? r["Thời gian"] ?? r["time"] ?? findKey(r, ["thời gian tạo đơn","thời gian","time"]);
    const rawSL = r["SL"] ?? r["Số lượng"] ?? r["Qty"] ?? findKey(r, ["sl","số lượng","qty"]);
    const rawTien = r["Thành tiền"] ?? r["Thanh tien"] ?? r["Doanh số"] ?? findKey(r, ["thành tiền","thanh tien","doanh số","revenue","total"]);

    const date = parseDateFlexible(rawDate);
    return {
      date,
      sl: toNumber(rawSL),
      thanhtien: toNumber(rawTien)
    };
  }).filter(d => d.date instanceof Date && !isNaN(d.date) && (d.thanhtien !== 0 || d.sl !== 0));

  if (!rows.length) {
    d3.select("#chart").append("text").text("Dữ liệu rỗng hoặc không tìm thấy cột phù hợp. Kiểm tra file CSV và tên cột.");
    console.warn("Parsed rows empty; raw headers:", Object.keys(raw[0] || {}));
    return;
  }

  // --- Group by weekday index (JS: 0=Sun,1=Mon,...). We'll present order Mon..Sun ---
  const groupedRoll = d3.rollups(
    rows,
    v => {
      const sumTien = d3.sum(v, d => d.thanhtien);
      const sumSL = d3.sum(v, d => d.sl);
      const uniqueDayCount = new Set(v.map(d => fmtYMD(d.date))).size;
      const avgTien = uniqueDayCount ? sumTien / uniqueDayCount : 0;
      const avgSL = uniqueDayCount ? sumSL / uniqueDayCount : 0;
      return { sumTien, sumSL, uniqueDayCount, avgTien, avgSL };
    },
    d => d.date.getDay()
  );

  const groupedMap = new Map(groupedRoll);

  const order = [1,2,3,4,5,6,0]; // Mon..Sun
  const labelMap = {1:"Thứ Hai",2:"Thứ Ba",3:"Thứ Tư",4:"Thứ Năm",5:"Thứ Sáu",6:"Thứ Bảy",0:"Chủ Nhật"};

  const data = order.map(idx => {
    const v = groupedMap.get(idx);
    return v
      ? { idx, day: labelMap[idx], ...v }
      : { idx, day: labelMap[idx], sumTien:0, sumSL:0, uniqueDayCount:0, avgTien:0, avgSL:0 };
  });

  // --- Chart layout ---
  const margin = { top: 50, right: 40, bottom: 60, left: 80 };
  const svgW = 1100, svgH = 600;
  const width = svgW - margin.left - margin.right;
  const height = svgH - margin.top - margin.bottom;

  const root = d3.select("#chart");
  root.selectAll("*").remove();
  root.attr("width", svgW).attr("height", svgH);
  const svg = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d=>d.day)).range([0,width]).padding(0.25);
  const yMax = d3.max(data, d => d.avgTien) || 0;
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);
  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map(d=>d.day));

  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

  // tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class","tooltip")
    .style("position","absolute")
    .style("pointer-events","none")
    .style("padding","8px")
    .style("background","rgba(255,255,255,0.95)")
    .style("border","1px solid #ccc")
    .style("border-radius","6px")
    .style("box-shadow","0 4px 12px rgba(0,0,0,0.08)")
    .style("visibility","hidden")
    .style("font-size","13px")
    .style("color","#000");   // fix màu chữ đen

  // bars
  svg.selectAll("rect.bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class","bar")
    .attr("x", d => x(d.day))
    .attr("y", d => y(d.avgTien))
    .attr("width", x.bandwidth())
    .attr("height", d => Math.max(0, height - y(d.avgTien)))
    .attr("fill", d => color(d.day))
    .attr("stroke","#2b2b2b")
    .attr("stroke-width", 0.3)
    .on("mouseover", (event,d) => {
      tooltip.style("visibility","visible")
        .html(`<strong>${d.day}</strong><br/>
               <strong>Doanh số bán TB:</strong> ${d3.format(",")(Math.round(d.avgTien))} VND<br/>
               <strong>Số lượng bán TB:</strong> ${d3.format(",")(Math.round(d.avgSL))} SKUs`);
    })
    .on("mousemove", (event) => {
      tooltip.style("top", (event.pageY - 48) + "px")
             .style("left", (event.pageX + 12) + "px");
    })
    .on("mouseout", () => tooltip.style("visibility","hidden"));

  // labels
  svg.selectAll("text.bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class","bar-label")
    .attr("x", d => x(d.day) + x.bandwidth()/2)
    .attr("y", d => y(d.avgTien) - 6)
    .attr("text-anchor", "middle")
    .style("font-size","12px")
    .style("fill","#111827")
    .text(d => d.avgTien ? `${d3.format(",")(Math.round(d.avgTien))} VND` : "");

  // title
  svg.append("text")
    .attr("x", width/2)
    .attr("y", -18)
    .attr("text-anchor","middle")
    .style("font-size","18px")
    .style("font-weight","700")
    .style("fill","#2563eb")
    .text("Doanh số bán hàng trung bình theo Ngày trong tuần");

})();
