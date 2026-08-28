export interface IChatMessageSnippet {
  senderUsername: string;
  senderDisplayName?: string;
  content: string;
  isSelf: boolean;
  time?: string;
}

export class ChatScreenshotService {
  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static wrapText(text: string, maxCharsPerLine: number = 38): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        if (word.length > maxCharsPerLine) {
          let remaining = word;
          while (remaining.length > maxCharsPerLine) {
            lines.push(remaining.slice(0, maxCharsPerLine));
            remaining = remaining.slice(maxCharsPerLine);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [''];
  }

  public static generateScreenshotSvg(
    viewerUsername: string,
    partnerUsername: string,
    partnerDisplayName: string,
    messages: IChatMessageSnippet[]
  ): string {
    const width = 640;
    const headerHeight = 70;
    const padding = 20;
    const bubbleMargin = 14;
    const lineHeight = 18;
    const bubblePadding = 12;

    let currentY = headerHeight + padding;
    const renderedBubbles: string[] = [];

    for (const msg of messages) {
      const lines = this.wrapText(msg.content, 40);
      const bubbleHeight = lines.length * lineHeight + bubblePadding * 2 + 12;
      const maxLineWidth = Math.max(...lines.map((l) => l.length));
      const bubbleWidth = Math.max(120, Math.min(420, maxLineWidth * 9 + bubblePadding * 2 + 20));

      const isSelf = msg.isSelf;
      const x = isSelf ? width - padding - bubbleWidth : padding + 36;
      const bubbleBg = isSelf ? '#1d9bf0' : '#2f3336';
      const textColor = '#ffffff';
      const timeColor = isSelf ? 'rgba(255,255,255,0.7)' : '#8b98a5';

      const avatarMarkup = !isSelf
        ? `<circle cx="${padding + 14}" cy="${currentY + 18}" r="14" fill="#3e4144" />
           <text x="${padding + 14}" y="${currentY + 23}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">${this.escapeXml(
            partnerUsername.slice(0, 2).toUpperCase()
          )}</text>`
        : '';

      const textSpans = lines
        .map((line, idx) => {
          return `<tspan x="${x + bubblePadding}" dy="${idx === 0 ? 0 : lineHeight}">${this.escapeXml(line)}</tspan>`;
        })
        .join('');

      const timeText = this.escapeXml(msg.time || 'Adesso');

      const bubbleSvg = `
        <g class="bubble">
          ${avatarMarkup}
          <rect x="${x}" y="${currentY}" width="${bubbleWidth}" height="${bubbleHeight}" rx="16" ry="16" fill="${bubbleBg}" />
          <text x="${x + bubblePadding}" y="${currentY + bubblePadding + 13}" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="${textColor}">
            ${textSpans}
          </text>
          <text x="${x + bubbleWidth - bubblePadding}" y="${currentY + bubbleHeight - 6}" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="${timeColor}" text-anchor="end">${timeText}</text>
        </g>
      `;

      renderedBubbles.push(bubbleSvg);
      currentY += bubbleHeight + bubbleMargin;
    }

    const totalHeight = Math.max(260, currentY + padding);
    const partnerInitials = this.escapeXml(partnerDisplayName.slice(0, 2).toUpperCase() || partnerUsername.slice(0, 2).toUpperCase());

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0b0e14" />
      <stop offset="100%" stop-color="#12161f" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <rect width="${width}" height="${totalHeight}" rx="14" fill="url(#bgGrad)" stroke="#2f3336" stroke-width="1.5" />

  <!-- Header -->
  <rect width="${width}" height="${headerHeight}" rx="14" fill="#16181c" />
  <line x1="0" y1="${headerHeight}" x2="${width}" y2="${headerHeight}" stroke="#2f3336" stroke-width="1" />

  <!-- Header Avatar -->
  <circle cx="42" cy="35" r="18" fill="#1d9bf0" />
  <text x="42" y="41" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${partnerInitials}</text>

  <!-- Header Title -->
  <text x="72" y="31" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" fill="#ffffff">${this.escapeXml(
    partnerDisplayName
  )}</text>
  <text x="72" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#71767b">@${this.escapeXml(
    partnerUsername
  )} · Chat Privata</text>

  <!-- Header Badge -->
  <rect x="${width - 130}" y="24" width="110" height="24" rx="12" fill="#202327" stroke="#2f3336" stroke-width="1"/>
  <text x="${width - 75}" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" fill="#1d9bf0" text-anchor="middle">TwAItter DM</text>

  <!-- Chat Messages -->
  ${renderedBubbles.join('\n')}
</svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
