<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <title>XML Sitemap | Ageason</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            line-height: 1.5;
            padding: 32px 20px 60px;
          }
          .container {
            max-width: 1100px;
            margin: 0 auto;
          }
          header {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px 32px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          }
          .tag {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #2563eb;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 3px 8px;
            border-radius: 9999px;
            margin-bottom: 12px;
          }
          h1 {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 8px;
            letter-spacing: -0.02em;
          }
          p.lead {
            font-size: 14px;
            color: #475569;
            margin-bottom: 20px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid #f1f5f9;
          }
          .stat-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
          }
          .stat-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #64748b;
          }
          .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
          }
          .table-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          }
          .table-header-bar {
            padding: 16px 24px;
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .table-header-bar h2 {
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
          }
          .table-responsive {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            padding: 12px 16px;
            border-bottom: 1px solid #e2e8f0;
            white-space: nowrap;
          }
          td {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            vertical-align: middle;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:hover td {
            background: #f8fafc;
          }
          .col-num {
            width: 40px;
            color: #94a3b8;
            font-size: 12px;
            font-variant-numeric: tabular-nums;
          }
          .col-url {
            max-width: 420px;
            word-break: break-all;
          }
          .col-url a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
          }
          .col-url a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 7px;
            border-radius: 6px;
            font-variant-numeric: tabular-nums;
          }
          .badge-p10 {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
          }
          .badge-p09 {
            background: #f0fdf4;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .badge-p08 {
            background: #f0f9ff;
            color: #0369a1;
            border: 1px solid #bae6fd;
          }
          .badge-p07 {
            background: #fefce8;
            color: #854d0e;
            border: 1px solid #fef08a;
          }
          .badge-p03 {
            background: #f8fafc;
            color: #64748b;
            border: 1px solid #e2e8f0;
          }
          .badge-freq {
            background: #f1f5f9;
            color: #475569;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: capitalize;
          }
          .date-cell {
            color: #64748b;
            font-size: 12px;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          .lang-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }
          .lang-tag {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            padding: 1px 5px;
            border-radius: 3px;
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
          }
          .lang-tag.is-xdef {
            background: #fef3c7;
            color: #92400e;
            border-color: #fde68a;
          }
          footer {
            margin-top: 24px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
          }
          footer a {
            color: #64748b;
            text-decoration: none;
          }
          footer a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <span class="tag">XML Sitemap</span>
            <h1>Ageason XML Sitemap</h1>
            <p class="lead">
              This index contains all publicly discoverable, canonical URLs for
              <strong>Ageason</strong>. It follows the standard
              <a href="https://www.sitemaps.org/protocol.html" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none;">sitemaps.org 0.9 protocol</a>
              and includes language alternates (hreflang) for multi-regional indexing by search engines such as Google, Bing, and DuckDuckGo.
            </p>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-label">Total URLs</div>
                <div class="stat-value"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Canonical Host</div>
                <div class="stat-value" style="font-size:15px;line-height:26px;">www.ageason.com</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Format</div>
                <div class="stat-value" style="font-size:15px;line-height:26px;">XML + XSLT 1.0</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Last Generated</div>
                <div class="stat-value" style="font-size:15px;line-height:26px;"><xsl:value-of select="sitemap:urlset/sitemap:url[1]/sitemap:lastmod"/></div>
              </div>
            </div>
          </header>

          <div class="table-card">
            <div class="table-header-bar">
              <h2>Indexable Pages (<xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>)</h2>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th class="col-num">#</th>
                    <th>URL</th>
                    <th>Priority</th>
                    <th>Changefreq</th>
                    <th>Last Modified</th>
                    <th>Language Alternates</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <tr>
                      <td class="col-num"><xsl:value-of select="position()"/></td>
                      <td class="col-url">
                        <a href="{sitemap:loc}">
                          <xsl:value-of select="sitemap:loc"/>
                        </a>
                      </td>
                      <td>
                        <xsl:variable name="p" select="sitemap:priority"/>
                        <span>
                          <xsl:attribute name="class">
                            <xsl:choose>
                              <xsl:when test="$p = '1.0'">badge badge-p10</xsl:when>
                              <xsl:when test="$p &gt;= 0.9">badge badge-p09</xsl:when>
                              <xsl:when test="$p &gt;= 0.8">badge badge-p08</xsl:when>
                              <xsl:when test="$p &gt;= 0.7">badge badge-p07</xsl:when>
                              <xsl:otherwise>badge badge-p03</xsl:otherwise>
                            </xsl:choose>
                          </xsl:attribute>
                          <xsl:value-of select="sitemap:priority"/>
                        </span>
                      </td>
                      <td>
                        <span class="badge-freq">
                          <xsl:value-of select="sitemap:changefreq"/>
                        </span>
                      </td>
                      <td class="date-cell">
                        <xsl:value-of select="sitemap:lastmod"/>
                      </td>
                      <td>
                        <div class="lang-list">
                          <xsl:for-each select="xhtml:link[@rel='alternate']">
                            <span>
                              <xsl:attribute name="class">
                                <xsl:choose>
                                  <xsl:when test="@hreflang = 'x-default'">lang-tag is-xdef</xsl:when>
                                  <xsl:otherwise>lang-tag</xsl:otherwise>
                                </xsl:choose>
                              </xsl:attribute>
                              <xsl:value-of select="@hreflang"/>
                            </span>
                          </xsl:for-each>
                        </div>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </div>

          <footer>
            <p>Ageason · <a href="https://www.ageason.com/">https://www.ageason.com</a></p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
