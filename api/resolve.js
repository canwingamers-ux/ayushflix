import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { tmdbId, type, season, episode } = req.query;

  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId is required' });
  }

  // A helper function to fetch with a strict AbortController timeout
  const fetchWithTimeout = async (url, options = {}, timeoutMs = 3000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  try {
    const netmirrorDomains = ['net-27.cc', 'net-25.cc', 'net-19.cc', 'netmirror.site', 'netmirror.org'];
    
    // Resolve in parallel with a 3-second timeout to prevent any sequential hanging
    const results = await Promise.all(
      netmirrorDomains.map(async (domain) => {
        try {
          const queryParams = (type === 'tv' || season || episode)
            ? `?id=${tmdbId}&s=${season || 1}&e=${episode || 1}`
            : `?id=${tmdbId}`;

          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': `https://${domain}/`,
          };

          const response = await fetchWithTimeout(`https://${domain}/playlist.php${queryParams}`, { headers }, 3000);
          if (response.ok) {
            const text = await response.text();
            let data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
              if (jsonMatch) {
                data = JSON.parse(jsonMatch[0]);
              }
            }

            let resolvedM3u8 = null;
            if (data && Array.isArray(data) && data.length > 0) {
              const item = data[0];
              if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
                const defaultSource = item.sources.find(s => s.default === "true" || s.default === true) || item.sources[0];
                const filePath = defaultSource.file;
                if (filePath) {
                  resolvedM3u8 = filePath.startsWith('http') ? filePath : `https://${domain}${filePath}`;
                }
              }
            }

            if (!resolvedM3u8) {
              const relativeMatch = text.match(/"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/i);
              if (relativeMatch && relativeMatch[1]) {
                const filePath = relativeMatch[1];
                resolvedM3u8 = filePath.startsWith('http') ? filePath : `https://${domain}${filePath}`;
              }
            }

            if (resolvedM3u8) {
              return { url: resolvedM3u8, domain };
            }
          }
        } catch (err) {
          console.error(`Error resolving from domain ${domain} in api/resolve:`, err.message || err);
        }
        return null;
      })
    );

    const activeResult = results.find(r => r !== null);

    if (activeResult && activeResult.url) {
      return res.json({ url: `/api/proxy/playlist?url=${encodeURIComponent(activeResult.url)}` });
    } else {
      return res.status(404).json({ error: 'Stream URL not found' });
    }
  } catch (error) {
    console.error('Error resolving NetMirror URL:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
