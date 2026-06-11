import { Injectable } from '@nestjs/common';
import { ThemesService } from './themes.service';
import { AdminGraphQLService } from '../shopify/admin-graphql.service';

const METAOBJECTS_QUERY = `
  query MetaobjectsByType($type: String!) {
    metaobjects(type: $type, first: 50) {
      edges {
        node {
          id
          handle
          type
          updatedAt
          fields { key value type }
        }
      }
    }
  }
`;

// Resolve "shopify://shop_images/<filename>" → real CDN URL via admin Files API.
const FILES_BY_NAME_QUERY = `
  query FilesByName($query: String!) {
    files(first: 5, query: $query) {
      edges {
        node {
          alt
          ... on MediaImage { image { url width height } }
        }
      }
    }
  }
`;

@Injectable()
export class BannersService {
  constructor(private themes: ThemesService, private gql: AdminGraphQLService) {}

  // Source 1: parse template JSONs from published theme, find image/banner blocks
  async fromTheme(templateName = 'index') {
    const theme = await this.themes.getPublished();
    if (!theme) return { source: 'theme', banners: [], reason: 'no published theme' };

    const themeId = theme.legacyResourceId ?? theme.id;

    // Try templates/index.json first (where actual section layout lives)
    let asset = await this.themes.getAsset(themeId, `templates/${templateName}.json`);
    let data: any = null;
    let sections: Record<string, any> = {};

    if (asset?.value) {
      try {
        data = JSON.parse(asset.value);
        sections = data?.sections ?? {};
      } catch {}
    }

    // Also merge sections from settings_data.json current (Dawn-style)
    const settings = await this.themes.getAsset(themeId, 'config/settings_data.json');
    if (settings?.value) {
      try {
        const sd = JSON.parse(settings.value);
        if (typeof sd?.current === 'object' && sd.current?.sections) {
          sections = { ...sections, ...sd.current.sections };
        }
      } catch {}
    }

    const banners: any[] = [];
    for (const [id, sec] of Object.entries<any>(sections)) {
      const t = (sec?.type ?? '').toLowerCase();
      if (t.includes('banner') || t.includes('slideshow') || t.includes('hero') || t.includes('image-with-text') || t.includes('image_with_text')) {
        banners.push({
          sectionId: id,
          type: sec.type,
          disabled: sec.disabled ?? false,
          settings: sec.settings ?? {},
          blocks: sec.blocks ?? {},
        });
      }
    }

    // Section files reference: list assets matching sections/*banner*.liquid
    const assets = await this.themes.listAssets(themeId);
    const sectionFiles = assets.filter((a: any) => {
      const k = a.key.toLowerCase();
      return k.startsWith('sections/') && (k.includes('banner') || k.includes('slideshow') || k.includes('hero'));
    }).map((a: any) => a.key);

    // Normalize each banner: flatten blocks → simple fields, resolve image URLs
    const normalized = await Promise.all(banners.map((b) => this.normalizeBanner(b)));

    return {
      source: 'theme',
      themeId,
      themeName: theme.name,
      template: templateName,
      banners: normalized,
      raw: banners, // keep raw if frontend wants details
      sectionFiles,
    };
  }

  private async normalizeBanner(b: any) {
    const blocks = b.blocks ?? {};
    const blockArr = Object.values(blocks) as any[];
    const heading = blockArr.find((x) => x?.type === 'heading')?.settings?.heading ?? null;
    const text = blockArr.find((x) => x?.type === 'text')?.settings?.text ?? null;
    const btnBlock = blockArr.find((x) => x?.type === 'buttons');
    const button = btnBlock?.settings
      ? {
          label: btnBlock.settings.button_label_1 ?? null,
          link: this.resolveLink(btnBlock.settings.button_link_1),
        }
      : null;

    const imageRef: string | undefined = b.settings?.image;
    const imageUrl = await this.resolveImage(imageRef);

    return {
      sectionId: b.sectionId,
      type: b.type,
      disabled: b.disabled,
      heading,
      text,
      button,
      image: imageUrl ? { url: imageUrl, ref: imageRef } : null,
      colorScheme: b.settings?.color_scheme ?? null,
      height: b.settings?.image_height ?? b.settings?.height ?? 'medium',
    };
  }

  private resolveLink(link?: string): string | null {
    if (!link) return null;
    // shopify://collections/all → /shop/collections/all-products  (approx)
    if (link.startsWith('shopify://collections/all')) return '/shop/products';
    if (link.startsWith('shopify://collections/')) return `/shop/collections/${link.split('/').pop()}`;
    if (link.startsWith('shopify://products/')) return `/shop/products/${link.split('/').pop()}`;
    if (link.startsWith('shopify://pages/')) return `/shop/pages/${link.split('/').pop()}`;
    return link;
  }

  private fileCache = new Map<string, string | null>();
  private async resolveImage(ref?: string): Promise<string | null> {
    if (!ref) return null;
    if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;
    if (this.fileCache.has(ref)) return this.fileCache.get(ref) ?? null;

    // shopify://shop_images/theme_cover_image.jpg → filename
    const m = ref.match(/shopify:\/\/(?:shop_images|files)\/(.+)$/);
    if (!m) {
      this.fileCache.set(ref, null);
      return null;
    }
    const filename = m[1];
    try {
      const data: any = await this.gql.request(FILES_BY_NAME_QUERY, { query: `filename:${filename}` });
      const url = data?.files?.edges?.[0]?.node?.image?.url ?? null;
      this.fileCache.set(ref, url);
      return url;
    } catch {
      this.fileCache.set(ref, null);
      return null;
    }
  }

  // Source 2: metaobjects of type "banner" or app-namespaced types
  async fromMetaobjects(type = 'banner') {
    try {
      const data: any = await this.gql.request(METAOBJECTS_QUERY, { type });
      return {
        source: 'metaobjects',
        type,
        banners: data.metaobjects.edges.map((e: any) => ({
          id: e.node.id,
          handle: e.node.handle,
          updatedAt: e.node.updatedAt,
          fields: Object.fromEntries(e.node.fields.map((f: any) => [f.key, f.value])),
        })),
      };
    } catch (err: any) {
      return { source: 'metaobjects', type, banners: [], reason: err.message };
    }
  }

  // Source 3: CMS HERO_BANNER blocks from local Postgres (your dashboard CMS)
  async fromLocalCms(prismaCmsService: any) {
    return prismaCmsService.list('HERO_BANNER');
  }
}
