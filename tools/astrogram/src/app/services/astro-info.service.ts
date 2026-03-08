import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AstroInfoService {
  private readonly WIKI_SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  private readonly WIKI_SEARCH_API = 'https://en.wikipedia.org/w/api.php';

  async getObjectDescription(
    name: string,
  ): Promise<{ description: string; extract: string } | null> {
    if (!name) return null;

    try {
      // Step 1: Search for the best matching Page Title
      const searchParams = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: name.trim(),
        format: 'json',
        origin: '*',
        srlimit: '1',
      });

      const searchResponse = await fetch(`${this.WIKI_SEARCH_API}?${searchParams.toString()}`);
      if (!searchResponse.ok) return null;

      const searchData = await searchResponse.json();
      const bestMatch = searchData.query?.search?.[0]?.title;

      if (!bestMatch) {
        return null;
      }

      // Step 2: Fetch the summary for the best match
      const encodedName = encodeURIComponent(bestMatch.replace(/\s+/g, '_'));
      const summaryUrl = `${this.WIKI_SUMMARY_API}${encodedName}`;

      const summaryResponse = await fetch(summaryUrl);
      if (!summaryResponse.ok) return null;

      const data = await summaryResponse.json();
      return {
        description: data.description || '',
        extract: data.extract || '',
      };
    } catch (error) {
      console.error('Failed to fetch from Wikipedia:', error);
      return null;
    }
  }
}
