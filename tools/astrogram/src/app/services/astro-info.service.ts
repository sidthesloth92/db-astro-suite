import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AstroInfoService {
  private readonly WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

  async getObjectDescription(name: string): Promise<{ description: string; extract: string } | null> {
    if (!name) return null;
    
    // Sanitize name for API (spaces to underscores)
    const encodedName = encodeURIComponent(name.trim().replace(/\s+/g, '_'));
    
    try {
      const response = await fetch(`${this.WIKI_API}${encodedName}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        description: data.description || '',
        extract: data.extract || ''
      };
    } catch (error) {
      console.error('Failed to fetch from Wikipedia:', error);
      return null;
    }
  }
}
