import pdf from "pdf-parse/lib/pdf-parse.js";

type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type ParsedLabelItem = {
  name: string;
  quantity: number;
};

export type ParsedShopeeLabel = {
  orderNumber: string;
  recipientName: string;
  fullAddress: string;
  city: string;
  items: ParsedLabelItem[];
};

export type ShopeeLabelProductRecord = {
  id: string;
  name: string;
  label?: string | null;
  volume?: string | null;
  price: number;
};

const PAGE_PREFIX = "__SHOPEE_LABEL_PAGE__";
const MARKETING_WORDS = new Set([
  "by",
  "meta",
  "metawellness",
  "wellness",
  "clinical",
  "grade",
  "with",
  "coa",
]);

const compactWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const titleCase = (value: string) =>
  compactWhitespace(value)
    .toLocaleLowerCase("id-ID")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("id-ID"));

const normalizeProductText = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/3/g, "e")
    .replace(/\+/g, " plus ")
    .replace(/(\d)\s+(mg|mcg|ml|iu|g)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const productTokens = (value: string) =>
  normalizeProductText(value)
    .split(" ")
    .filter(
      (token) =>
        token &&
        !MARKETING_WORDS.has(token) &&
        !/^\d+(?:\.\d+)?(?:mg|mcg|ml|iu|g)?$/.test(token),
    );

const strengths = (value: string): string[] =>
  normalizeProductText(value).match(/\b\d+(?:\.\d+)?(?:mg|mcg|ml|iu|g)\b/g) || [];

const scoreProductMatch = (
  labelName: string,
  product: ShopeeLabelProductRecord,
) => {
  const label = normalizeProductText(labelName);
  const candidate = normalizeProductText(
    [product.name, product.label, product.volume].filter(Boolean).join(" "),
  );
  const labelTokens = productTokens(labelName);
  const candidateTokens = productTokens(candidate);
  const labelStrengths = strengths(labelName);
  const candidateStrengths = strengths(candidate);
  let score = 0;

  if (candidate && (label.includes(candidate) || candidate.includes(label))) {
    score += 120;
  }

  const matchingTokens = labelTokens.filter((token) =>
    candidateTokens.some(
      (candidateToken) =>
        candidateToken === token ||
        candidateToken.includes(token) ||
        token.includes(candidateToken),
    ),
  );

  if (labelTokens.length > 0) {
    score += (matchingTokens.length / labelTokens.length) * 80;
  }

  if (
    labelTokens[0] &&
    candidateTokens.some(
      (candidateToken) =>
        candidateToken === labelTokens[0] ||
        candidateToken.includes(labelTokens[0]) ||
        labelTokens[0].includes(candidateToken),
    )
  ) {
    score += 40;
  }

  if (labelStrengths.length && candidateStrengths.length) {
    const strengthMatches = labelStrengths.some((strength) =>
      candidateStrengths.includes(strength),
    );
    score += strengthMatches ? 35 : -120;
  }

  return score;
};

export const matchShopeeLabelProduct = (
  labelName: string,
  products: ShopeeLabelProductRecord[],
) => {
  const ranked = products
    .map((product) => ({
      product,
      score: scoreProductMatch(labelName, product),
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const runnerUp = ranked[1];

  if (!best || best.score < 65 || (runnerUp && best.score - runnerUp.score < 8)) {
    return null;
  }

  return best.product;
};

const renderPageItems = async (page: any) => {
  const content = await page.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  const items: PdfTextItem[] = content.items
    .map((item: any) => ({
      text: compactWhitespace(String(item.str || "")),
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      width: Number(item.width || 0),
    }))
    .filter((item: PdfTextItem) => item.text);

  return `${PAGE_PREFIX}${JSON.stringify(items)}`;
};

const extractPages = (text: string) =>
  text
    .split(PAGE_PREFIX)
    .map((page) => page.trim())
    .filter(Boolean)
    .map((page) => {
      const jsonEnd = page.lastIndexOf("]");
      return JSON.parse(page.slice(0, jsonEnd + 1)) as PdfTextItem[];
    });

const sameRow = (first: PdfTextItem, second: PdfTextItem, tolerance = 2) =>
  Math.abs(first.y - second.y) <= tolerance;

const joinPositionedItems = (items: PdfTextItem[]) => {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let result = "";
  let previous: PdfTextItem | null = null;

  for (const item of sorted) {
    const gap = previous ? item.x - (previous.x + previous.width) : 0;
    result += previous && gap > 1.5 ? ` ${item.text}` : item.text;
    previous = item;
  }

  return compactWhitespace(result);
};

const groupTextLines = (items: PdfTextItem[]) => {
  const lines: Array<{ y: number; items: PdfTextItem[] }> = [];

  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const line = lines.find((entry) => Math.abs(entry.y - item.y) <= 2);
    if (line) {
      line.items.push(item);
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => joinPositionedItems(line.items));
};

const findText = (items: PdfTextItem[], pattern: RegExp) =>
  items.find((item) => pattern.test(item.text));

const parseOrderNumber = (items: PdfTextItem[]) => {
  for (const item of items) {
    const match = item.text.match(
      /(?:No\.?\s*Pesanan|Pesan)\s*:\s*([A-Z0-9-]+)/i,
    );
    if (match?.[1]) return match[1].toUpperCase();
  }

  return "";
};

const parseRecipient = (items: PdfTextItem[]) => {
  const recipientLabel = findText(items, /^Penerima\s*:/i);
  if (!recipientLabel) return "";

  const senderLabel = items.find(
    (item) => /^Pengirim\s*:/i.test(item.text) && sameRow(item, recipientLabel, 3),
  );
  const rightBoundary = senderLabel?.x || 140;
  const labelEnd = recipientLabel.x + recipientLabel.width - 1;
  const name = items
    .filter(
      (item) =>
        sameRow(item, recipientLabel, 3) &&
        item.x > labelEnd &&
        item.x < rightBoundary,
    )
    .sort((a, b) => a.x - b.x)
    .map((item) => item.text)
    .join(" ");

  return titleCase(name);
};

const parseAddress = (items: PdfTextItem[]) => {
  const recipientLabel = findText(items, /^Penerima\s*:/i);
  if (!recipientLabel) return "";

  const senderLabel = items.find(
    (item) => /^Pengirim\s*:/i.test(item.text) && sameRow(item, recipientLabel, 3),
  );
  const rightBoundary = senderLabel?.x || 140;
  const districtItem = findText(items, /^CIPONDOH$/i);
  const lowerBoundary = districtItem ? districtItem.y + 5 : recipientLabel.y - 60;

  const addressItems = items
    .filter(
      (item) =>
        item.x < rightBoundary &&
        item.y < recipientLabel.y - 3 &&
        item.y > lowerBoundary,
    )
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

  return groupTextLines(addressItems).join("\n").trim();
};

const parseCity = (items: PdfTextItem[]) => {
  const districtItem = findText(items, /^CIPONDOH$/i);
  if (districtItem) {
    const city = items
      .filter(
        (item) =>
          sameRow(item, districtItem, 2) &&
          item.x < districtItem.x &&
          /\bKOTA\b/i.test(item.text),
      )
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text)
      .join(" ");

    if (city) return compactWhitespace(city).toUpperCase();
  }

  const cityFromAddress = items.find(
    (item) => item.x < 140 && /\bKOTA\s+[A-Z ]+/i.test(item.text),
  );
  const match = cityFromAddress?.text.match(/\b(KOTA\s+[A-Z ]+)/i);
  return compactWhitespace(match?.[1] || "").replace(/,$/, "").toUpperCase();
};

const parseItems = (items: PdfTextItem[]) => {
  const header = findText(items, /^Nama Produk$/i);
  const footer = findText(items, /^Pesan\s*:/i);
  if (!header || !footer) return [];

  const rowStarts = items
    .filter(
      (item) =>
        item.x < header.x &&
        item.y < header.y - 2 &&
        item.y > footer.y + 2 &&
        /^\d+$/.test(item.text),
    )
    .sort((a, b) => b.y - a.y);

  return rowStarts
    .map((rowStart, index) => {
      const nextRowY = rowStarts[index + 1]?.y ?? footer.y;
      const productParts = items
        .filter(
          (item) =>
            item.x >= header.x - 1 &&
            item.x < 159 &&
            item.y <= rowStart.y + 2 &&
            item.y > nextRowY + 2,
        );

      const productLines = groupTextLines(productParts);
      const productName = productLines.reduce((name, line) => {
        if (!name) return line;
        return /\b[A-Z]$/.test(name) && /^[a-z]/.test(line)
          ? `${name}${line}`
          : `${name} ${line}`;
      }, "");

      const quantityItem = items.find(
        (item) =>
          item.x > 245 &&
          sameRow(item, rowStart, 2) &&
          /^\d+$/.test(item.text),
      );

      return {
        name: compactWhitespace(productName),
        quantity: Math.max(1, Number(quantityItem?.text || 1)),
      };
    })
    .filter((item) => item.name);
};

export async function parseShopeeLabelPdf(
  input: ArrayBuffer | Buffer,
): Promise<ParsedShopeeLabel> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const parsed = await pdf(buffer, { pagerender: renderPageItems });
  const pages = extractPages(parsed.text);
  const items = pages.flat();

  if (!items.length) {
    throw new Error(
      "No selectable text was found in this PDF. Please use the original Shopee shipping label PDF.",
    );
  }

  const result = {
    orderNumber: parseOrderNumber(items),
    recipientName: parseRecipient(items),
    fullAddress: parseAddress(items),
    city: parseCity(items),
    items: parseItems(items),
  };

  if (!result.orderNumber || !result.recipientName || !result.fullAddress) {
    throw new Error(
      "The PDF does not look like a supported Shopee shipping label.",
    );
  }

  return result;
}
