// Pure product matcher for Discord bot input such as "reta 10 mg" or "nad 500".
// No imports so it can be unit tested without Supabase.

export type MatchableProduct = {
  id: string;
  name: string;
  label?: string | null;
  volume?: string | null;
  slug?: string | null;
  is_active?: boolean | null;
};

export type ProductMatchResult<T extends MatchableProduct> =
  | { status: "matched"; product: T }
  | { status: "ambiguous"; candidates: T[] }
  | { status: "not_found"; suggestions: T[] };

// Abbreviations that are not simple prefixes of the product name. Prefixes
// such as "reta", "gluta", or "tirz" already match without an alias.
const TOKEN_ALIASES: Record<string, string> = {};

export function normalizeProductText(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: unknown) {
  return normalizeProductText(value)
    .split(" ")
    .filter(Boolean)
    .map((token) => TOKEN_ALIASES[token] || token);
}

export function getProductDisplayName(product: Partial<MatchableProduct>) {
  const name = String(product.name || "").trim();
  const volume = String(product.volume || "").trim();
  if (!volume) return name || "Product";

  // Skip the volume when the name already contains it ("Retatrutide 10mg").
  const compactName = normalizeProductText(name).replace(/ /g, "");
  const compactVolume = normalizeProductText(volume).replace(/ /g, "");
  return compactName.includes(compactVolume) ? name : `${name} ${volume}`;
}

function countMatchedTokens(
  queryTokens: string[],
  tokens: string[],
  compact: string,
) {
  const seen = new Map<string, number>();
  let matched = 0;

  for (const queryToken of queryTokens) {
    const occurrence = seen.get(queryToken) || 0;
    seen.set(queryToken, occurrence + 1);

    if (/^\d+$/.test(queryToken) || queryToken.length < 3) {
      // Numbers and short tokens must match exactly ("10" never matches
      // "100"), and "10x10" needs two 10s.
      const available = tokens.filter((token) => token === queryToken).length;
      if (available > occurrence) matched += 1;
    } else if (
      tokens.some((token) => token.startsWith(queryToken)) ||
      // "motsc" should still find "Mots-C".
      (queryToken.length >= 4 && compact.includes(queryToken))
    ) {
      matched += 1;
    }
  }

  return matched;
}

function bigrams(value: string) {
  const grams = new Map<string, number>();
  for (let index = 0; index < value.length - 1; index += 1) {
    const gram = value.slice(index, index + 2);
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }
  return grams;
}

function similarity(left: string, right: string) {
  if (left.length < 2 || right.length < 2) return 0;
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  let overlap = 0;
  for (const [gram, count] of leftGrams) {
    overlap += Math.min(count, rightGrams.get(gram) || 0);
  }
  return (2 * overlap) / (left.length - 1 + right.length - 1);
}

export function matchProduct<T extends MatchableProduct>(
  rawQuery: string,
  products: T[],
): ProductMatchResult<T> {
  const query = normalizeProductText(rawQuery);
  const queryTokens = tokenize(rawQuery);
  if (!queryTokens.length) return { status: "not_found", suggestions: [] };

  const scored = products.map((product) => {
    const nameTokens = tokenize(`${product.name || ""} ${product.volume || ""}`);
    const extraTokens = tokenize(`${product.label || ""} ${product.slug || ""}`);
    const allTokens = [...nameTokens, ...extraTokens];
    const compactName = nameTokens.join("");
    const compactAll = allTokens.join("");
    const inName = countMatchedTokens(queryTokens, nameTokens, compactName);
    const inAny = countMatchedTokens(queryTokens, allTokens, compactAll);
    // Exact name or SKU label wins outright. Slugs are excluded because some
    // slugs are bare product names shared by several sizes.
    const exact = [
      product.name,
      `${product.name || ""} ${product.volume || ""}`,
      getProductDisplayName(product),
      product.label,
    ].some((value) => value && normalizeProductText(value) === query);

    return {
      product,
      inName,
      inAny,
      exact,
      full: inAny === queryTokens.length,
      similarity: similarity(query.replace(/ /g, ""), compactName),
    };
  });

  const exactMatches = scored.filter((item) => item.exact);
  if (exactMatches.length === 1) {
    return { status: "matched", product: exactMatches[0].product };
  }
  if (exactMatches.length > 1) {
    return {
      status: "ambiguous",
      candidates: exactMatches.map((item) => item.product),
    };
  }

  const fullMatches = scored
    .filter((item) => item.full)
    .sort(
      (left, right) =>
        right.inName - left.inName || right.similarity - left.similarity,
    );

  if (fullMatches.length === 1) {
    return { status: "matched", product: fullMatches[0].product };
  }
  if (fullMatches.length > 1) {
    // Prefer a product whose own name/size explains more of the query than
    // its label or slug ("bpc" -> BPC-157, not a stack whose slug says bpc).
    if (fullMatches[0].inName > fullMatches[1].inName) {
      return { status: "matched", product: fullMatches[0].product };
    }
    return {
      status: "ambiguous",
      candidates: fullMatches.slice(0, 8).map((item) => item.product),
    };
  }

  const suggestions = scored
    .filter((item) => item.inAny > 0 || item.similarity >= 0.4)
    .sort(
      (left, right) =>
        right.inAny - left.inAny ||
        right.similarity - left.similarity ||
        right.inName - left.inName,
    )
    .slice(0, 5)
    .map((item) => item.product);

  return { status: "not_found", suggestions };
}

// Products hidden from the storefront (is_active false, the panel's "Hidden")
// are only off /shop: the team still sells them through WhatsApp and the
// marketplaces. They are tried only when no visible product fits, so a name or
// SKU label that already found a visible product keeps finding it, even when a
// hidden row shares it (BACW3 is both "Bac Water 3ml" and the hidden
// "BAC WATER S").
export function matchProductVisibleFirst<T extends MatchableProduct>(
  rawQuery: string,
  products: T[],
): ProductMatchResult<T> {
  const visible = products.filter((product) => product.is_active !== false);
  const hidden = products.filter((product) => product.is_active === false);
  const result = matchProduct(rawQuery, visible);
  if (result.status !== "not_found" || !hidden.length) return result;

  const fallback = matchProduct(rawQuery, hidden);
  if (fallback.status !== "not_found") return fallback;
  return {
    status: "not_found",
    suggestions: [...result.suggestions, ...fallback.suggestions].slice(0, 5),
  };
}
