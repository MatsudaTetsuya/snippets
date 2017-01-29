/**
 * Copyright 2017 Matsuda Tetsuya
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */

import * as d3 from "d3";

const yqlUrl = "https://query.yahooapis.com/v1/public/yql";
const yqlTable = "yahoo.finance.historicaldata";
const yqlSymbol = "^N225"
const yqlEnvironment = "store://datatables.org/alltableswithkeys";

const viewId = "chart";
const viewWidth = 1280;
const viewHeight = 720;

class Candle {
    readonly date: Date;
    readonly open: number;
    readonly high: number;
    readonly low: number;
    readonly close: number;

    constructor(
        date: string, open: string, high: string, low: string, close: string) {
        this.date = new Date(date);
        this.open = Number(open);
        this.high = Number(high);
        this.low = Number(low);
        this.close = Number(close);
    }
}

class DateScale {
    private static readonly months: string[] = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    constructor(
        readonly date: Date,
        readonly printsLine: boolean,
        readonly printsDate: boolean) {
    }

    toString(): string {
        return DateScale.months[this.date.getMonth()] + " " +
            this.date.getDate() + ", " + this.date.getFullYear();
    }
}

const width: number = document.getElementById(viewId).offsetWidth;
const height: number = Math.round(viewHeight * width / viewWidth);

const fontSize: string = ((): string => {
    let size: number = Math.round(18 * width / viewWidth);
    return `${size < 6 ? 6 : size}pt`;
})();

const svg: d3.Selection<any> = d3.select(`#${viewId}`).append("svg")
    .attr("class", `${viewId}-svg`)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

d3.select(window).on("resize", (): void => {
    const width: number = document.getElementById(viewId).offsetWidth;
    const height: number = Math.round(viewHeight * width / viewWidth);
    svg.attr("width", width).attr("height", height);
});

function drawChart(candles: Candle[]): void {
    const candleSpan: number = 30 * width / viewWidth;

    const candleCount = Math.round(width * 0.88 / candleSpan);

    if (candles.length < candleCount) {
        return;
    }

    candles = candles.slice(candles.length - candleCount);

    const [priceMin, priceMax] = ((): [number, number] => {
        const average: number = candles.reduce(
            (total: number, candle: Candle): number =>
                total + candle.close, 0) / candles.length;
        const sdev: number = Math.sqrt(
            candles.reduce(
                (total: number, candle: Candle): number =>
                    total + Math.pow(candle.close - average, 2), 0) /
            (candles.length - 1));
        return [average - 9 * sdev, average + 9 * sdev];
    })();

    const candleMax: Candle = candles
        .filter((candle: Candle): boolean =>
            priceMin < candle.high && candle.high < priceMax)
        .reduce((lhs: Candle, rhs: Candle): Candle =>
            lhs.high > rhs.high ? lhs : rhs);

    const candleMin: Candle = candles
        .filter((candle: Candle): boolean =>
            priceMin < candle.low && candle.low < priceMax)
        .reduce((lhs: Candle, rhs: Candle): Candle =>
            lhs.low < rhs.low ? lhs : rhs);

    const priceRatio: number = (candleMax.high - candleMin.low) / 0.6 / height;

    const priceSpan: number = [100, 200, 300, 400, 500, 1000].reduce(
        (lhs: number, rhs: number): number => {
            let span: number = (candleMax.high - candleMin.low) / 5;
            return Math.abs(lhs - span) < Math.abs(rhs - span) ? lhs : rhs;
        });

    const prices = ((): number[] => {
        const prices = new Array<number>();
        const priceMax: number =
            Math.floor(candleMax.high / priceSpan) * priceSpan;
        for (let price = priceMax; price > candleMin.low; price -= priceSpan) {
            prices.push(price);
        }
        return prices;
    })();

    const dates = ((): DateScale[] => {
        const dates = new Array<DateScale>();
        let clock = 0;
        for (let index: number = candles.length - 1; index >= 0; --index) {
            const candle: Candle = candles[index];
            if (index < 1) {
                dates.push(
                    new DateScale(
                        candle.date, candle.date.getDay() == 1, false));
            }
            else {
                const delta: number =
                    candles[index - 1].date.getDay() - candle.date.getDay();
                if (delta <= 1) {
                    dates.push(new DateScale(candle.date, false, false));
                }
                else {
                    if (clock % 3 != 0) {
                        dates.push(new DateScale(candle.date, true, false));
                    }
                    else {
                        if (index < candles.length / 10) {
                            dates.push(new DateScale(candle.date, true, false));
                        }
                        else {
                            dates.push(new DateScale(candle.date, true, true));
                        }
                    }
                    ++clock;
                }
            }
        }
        return dates.reverse();
    })();

    const root: d3.Selection<any> = svg.append("g")
        .attr("class", `${viewId}-root`)
        .attr("transform", "translate(0.5, 0.5)");

    const priceScales: d3.Selection<any> = root.append("g")
        .attr("transform", (): string => {
            let y: number =
                Math.round(candleMax.high / priceRatio + height * 0.15);
            return `translate(0, ${y})`
        })
        .selectAll(`.${viewId}-price-scale`)
        .data(prices)
        .enter()
        .append("g")
        .attr("class", `${viewId}-price-scale`);

    priceScales.append("line")
        .attr("class", `${viewId}-division-line`)
        .attr("x1", 0)
        .attr("y1", (price: number): number => -Math.round(price / priceRatio))
        .attr("x2", Math.round(candles.length * candleSpan))
        .attr("y2", (price: number): number => -Math.round(price / priceRatio));

    priceScales.append("text")
        .attr("class", `${viewId}-text`)
        .attr("x", Math.round(candles.length * candleSpan + width * 0.02))
        .attr("y", (price: number): number => -Math.round(price / priceRatio))
        .attr("dy", ".3em")
        .style("font-size", fontSize)
        .text((price: number): string => String(price));

    root.append("line")
        .attr("class", `${viewId}-division-line`)
        .attr("x1", 0)
        .attr("y1", Math.round(height * 0.89))
        .attr("x2", Math.round(candles.length * candleSpan))
        .attr("y2", Math.round(height * 0.89));

    const dateScales: d3.Selection<any> = root.append("g")
        .attr("transform", (): string => {
            return `translate(${Math.round(candleSpan * 0.5)}, 0)`
        })
        .selectAll(`.${viewId}-date-scale`)
        .data(dates)
        .enter()
        .append("g")
        .attr("class", `${viewId}-date-scale`)
        .attr("transform", (date: DateScale, index: number): string => {
            return `translate(${Math.round(candleSpan * index)}, 0)`
        });

    dateScales.filter((date: DateScale): boolean => date.printsLine)
        .append("line")
        .attr("class", `${viewId}-division-line`)
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", Math.round(height * 0.89));

    dateScales.filter((date: DateScale): boolean => date.printsDate)
        .append("text")
        .attr("class", `${viewId}-text`)
        .attr("x", 0)
        .attr("y", Math.round(height * 0.9))
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .style("font-size", fontSize)
        .text((date: DateScale): string => date.toString());

    const graph: d3.Selection<any> = root.append("g")
        .attr("class", `${viewId}-graph`)
        .attr("transform", (): string => {
            let x: number = Math.round(candleSpan * 0.5);
            let y: number = Math.round(
                candleMax.high / priceRatio + height * 0.15);
            return `translate(${x}, ${y}) `
        });

    const plots: d3.Selection<any> = graph.selectAll(`.${viewId}-candle`)
        .data(candles)
        .enter()
        .append("g")
        .attr("class", `${viewId}-candle`)
        .attr("transform", (candle: Candle, index: number): string =>
            `translate(${Math.round(index * candleSpan)}, 0)`
        );

    plots.filter(
        (candle: Candle): boolean =>
            candleMin.low <= candle.high && candle.high <= candleMax.high &&
            candleMin.low <= candle.low && candle.low <= candleMax.high)
        .append("line")
        .attr("class", `${viewId}-candle-line`)
        .attr("x1", 0)
        .attr("y1", (candle: Candle): number =>
            -Math.round(candle.high / priceRatio))
        .attr("x2", 0)
        .attr("y2", (candle: Candle): number =>
            -Math.round(candle.low / priceRatio));

    plots.filter(
        (candle: Candle): boolean =>
            candleMin.low <= candle.open && candle.open <= candleMax.high &&
            candleMin.low <= candle.close && candle.close <= candleMax.high)
        .append("rect")
        .attr("class", (candle: Candle): string =>
            `${viewId}-candle-${candle.close > candle.open ? "up" : "down"}`
        )
        .attr("x", -Math.round(candleSpan / 3))
        .attr("y", (candle: Candle): number =>
            -Math.round(candle.open / priceRatio)
        )
        .attr("width", `${Math.round(candleSpan / 3) * 2}px`)
        .attr("height", "1px")
        .transition()
        .duration(1000)
        .attr("y", (candle: Candle): number => {
            let y: number =
                candle.close > candle.open ? candle.close : candle.open;
            return -Math.round(y / priceRatio);
        })
        .attr("height", (candle: Candle): string => {
            let height: number = candle.close > candle.open ?
                candle.close - candle.open : candle.open - candle.close;
            height = Math.round(height / priceRatio);
            height = height == 0 ? 1 : height;
            return `${height}px`;
        });
}

function handleStateChange(xhr: XMLHttpRequest): void {
    if (xhr.readyState == 4 && xhr.status == 200) {
        if (xhr.responseText) {
            const response: any = JSON.parse(xhr.responseText);
            if (response &&
                response.query &&
                response.query.count &&
                response.query.results &&
                response.query.results.quote) {
                const candles = new Array<Candle>();
                for (let i = 0; i < response.query.count; ++i) {
                    const quote: any = response.query.results.quote[i];
                    const candle = new Candle(
                        quote.Date, quote.Open, quote.High, quote.Low,
                        quote.Close);
                    candles.push(candle);
                }
                drawChart(candles.reverse());
            }
        }
    }
}

const xhr = new XMLHttpRequest();
xhr.onreadystatechange = (): void => { handleStateChange(xhr) };
xhr.open("GET", ((): string => {
    const date = new Date();
    const tail = date.toISOString();
    const head = new Date(date.setMonth(date.getMonth() - 3)).toISOString();
    const query = [
        "select Date, Open, High, Low, Close",
        `from ${yqlTable}`,
        `where symbol = "${yqlSymbol}"`,
        `and startDate = "${head}" and endDate = "${tail}"`].join(" ");
    const url = yqlUrl + "?" + [
        "q=" + encodeURIComponent(query),
        "format=json",
        "env=" + encodeURIComponent(yqlEnvironment)].join("&");
    return url;
})());
xhr.send();
