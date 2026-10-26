// Scriptable lock screen widget: how long the current reading has been going.
// The widget counts on its own from `counting_since`, so it only needs the
// server to learn that a session started, paused or ended.

const SERVER = 'http://TAILSCALE_IP:8000';
const REFRESH_MINUTES = 5;
const DAY_SQUARE_SIZE = 11;
const MAX_HEAT_LEVEL = 4;

const timer = await loadTimer();
const widget = new ListWidget();
widget.url = `${SERVER}/quick-log`;
widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

if (config.widgetFamily === 'accessoryInline') {
    renderInline(widget, timer);
} else {
    renderRectangular(widget, timer);
}

if (config.runsInWidget) {
    Script.setWidget(widget);
} else {
    await widget.presentAccessoryRectangular();
}

Script.complete();

async function loadTimer() {
    const request = new Request(`${SERVER}/quick-log/timer`);
    request.headers = { Accept: 'application/json' };
    request.timeoutInterval = 10;

    try {
        return await request.loadJSON();
    } catch {
        return null;
    }
}

function renderInline(widget, timer) {
    if (timer?.state === 'reading') {
        addTimer(widget, timer, Font.body());

        return;
    }

    widget.addText(statusLabel(timer));
}

function renderRectangular(widget, timer) {
    if (timer === null) {
        widget.addText(statusLabel(timer)).font = Font.headline();

        return;
    }

    if (timer.state === 'idle') {
        renderIdle(widget, timer.reading);

        return;
    }

    const title = widget.addText(timer.title);
    title.font = Font.caption1();
    title.lineLimit = 1;

    if (timer.state === 'reading') {
        addTimer(widget, timer, Font.boldSystemFont(26));
    } else {
        widget.addText(`⏸ ${Math.floor(timer.elapsed / 60)} min`).font =
            Font.boldSystemFont(26);
    }

    const page = widget.addText(`desde a p. ${timer.start_page}`);
    page.font = Font.caption2();
}

function renderIdle(widget, reading) {
    if (reading === null) {
        widget.addText('releia').font = Font.headline();
        widget.addText('nenhum livro em andamento').font = Font.caption2();

        return;
    }

    const title = widget.addText(reading.title);
    title.font = Font.semiboldSystemFont(13);
    title.lineLimit = 1;

    widget.addSpacer(3);
    addWeek(widget, reading);
    widget.addSpacer(3);

    const pages = reading.pages ? ` de ${reading.pages}` : '';
    widget.addText(`p. ${reading.current_page}${pages}`).font = Font.caption2();
}

/** The last seven days as squares, brighter on days with more pages, like the app. */
function addWeek(widget, reading) {
    const row = widget.addStack();
    row.centerAlignContent();

    for (const level of reading.week) {
        const symbol = SFSymbol.named(level > 0 ? 'square.fill' : 'square');
        const square = row.addImage(symbol.image);
        square.imageSize = new Size(DAY_SQUARE_SIZE, DAY_SQUARE_SIZE);
        square.tintColor = new Color(
            '#ffffff',
            0.4 + (0.6 * level) / MAX_HEAT_LEVEL,
        );
        row.addSpacer(2);
    }

    row.addSpacer(4);
    const days = reading.streak === 1 ? 'dia' : 'dias';
    row.addText(`${reading.streak} ${days}`).font = Font.caption1();
}

function addTimer(widget, timer, font) {
    const counter = widget.addDate(new Date(timer.counting_since));
    counter.applyTimerStyle();
    counter.font = font;
}

function statusLabel(timer) {
    if (timer === null) {
        return 'releia offline';
    }

    return timer.state === 'paused' ? 'leitura pausada' : 'releia';
}
