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

    return {
      source: 'theme',
      themeId,
      themeName: theme.name,
      template: templateName,
      banners,
      sectionFiles,
    };
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
