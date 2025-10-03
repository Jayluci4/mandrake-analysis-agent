#!/usr/bin/env python3
"""
Real-Time Literature Intelligence Engine using Free APIs
Daily monitoring of biomedical research with automated insights.
"""

import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import json
from typing import List, Dict
import re

class LiteratureIntelligence:
    """Real-time biomedical literature monitoring and analysis."""

    def __init__(self):
        # Free APIs
        self.pubmed_base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        self.email = "research@biomni.ai"  # Required for NCBI API

        # Research areas to monitor
        self.research_areas = {
            "crispr": ["CRISPR", "Cas9", "gene editing", "sgRNA"],
            "drug_discovery": ["drug discovery", "small molecule", "lead compound", "medicinal chemistry"],
            "protein_folding": ["protein folding", "structure prediction", "AlphaFold", "ESMFold"],
            "cancer_biology": ["cancer biology", "oncology", "tumor", "metastasis"],
            "immunology": ["immunotherapy", "T cell", "antibody", "vaccine"],
            "genomics": ["genomics", "RNA-seq", "single cell", "transcriptomics"],
            "ai_biomedical": ["artificial intelligence", "machine learning", "deep learning", "biomedical"]
        }

    def search_pubmed_recent(self, keywords: List[str], days: int = 1) -> Dict:
        """Search PubMed for recent papers on specific keywords."""
        try:
            # Build search query
            search_terms = " OR ".join([f'"{kw}"' for kw in keywords])

            # Date filter for recent papers
            date_from = (datetime.now() - timedelta(days=days)).strftime("%Y/%m/%d")
            date_query = f"({search_terms}) AND ({date_from}[PDAT]:3000[PDAT])"

            # Search PubMed
            search_url = f"{self.pubmed_base}/esearch.fcgi"
            search_params = {
                "db": "pubmed",
                "term": date_query,
                "retmax": 20,
                "email": self.email,
                "tool": "biomni_research_platform"
            }

            response = requests.get(search_url, params=search_params, timeout=10)

            if response.status_code == 200:
                # Parse XML response
                root = ET.fromstring(response.content)
                pmids = [id_elem.text for id_elem in root.findall(".//Id")]

                if pmids:
                    # Get detailed information
                    papers = self._fetch_paper_details(pmids)
                    return {
                        "success": True,
                        "keyword_group": keywords,
                        "papers_found": len(papers),
                        "pmids": pmids,
                        "papers": papers,
                        "search_date": datetime.now().isoformat()
                    }
                else:
                    return {
                        "success": True,
                        "keyword_group": keywords,
                        "papers_found": 0,
                        "message": f"No recent papers found for: {', '.join(keywords)}"
                    }

        except Exception as e:
            return {
                "success": False,
                "error": f"PubMed search failed: {e}",
                "keyword_group": keywords
            }

    def _fetch_paper_details(self, pmids: List[str]) -> List[Dict]:
        """Fetch detailed information for PubMed IDs."""
        papers = []

        if not pmids:
            return papers

        try:
            # Fetch paper details
            fetch_url = f"{self.pubmed_base}/efetch.fcgi"
            fetch_params = {
                "db": "pubmed",
                "id": ",".join(pmids),
                "retmode": "xml",
                "email": self.email
            }

            response = requests.get(fetch_url, params=fetch_params, timeout=15)

            if response.status_code == 200:
                try:
                    root = ET.fromstring(response.content)
                except ET.ParseError as e:
                    print(f"XML parse error: {e}")
                    return papers

                for article in root.findall(".//PubmedArticle"):
                    try:
                        title_elem = article.find(".//ArticleTitle")
                        title = title_elem.text if title_elem is not None and title_elem.text else "No title"

                        abstract_elem = article.find(".//AbstractText")
                        abstract = abstract_elem.text if abstract_elem is not None and abstract_elem.text else "No abstract available"

                        # Extract authors with null checks
                        authors = []
                        for author in article.findall(".//Author"):
                            lastname = author.find("LastName")
                            firstname = author.find("ForeName")
                            if (lastname is not None and lastname.text and
                                firstname is not None and firstname.text):
                                authors.append(f"{lastname.text}, {firstname.text}")

                        # Extract journal and date with null checks
                        journal_elem = article.find(".//Journal/Title")
                        journal = journal_elem.text if journal_elem is not None and journal_elem.text else "Unknown journal"

                        date_elem = article.find(".//PubDate/Year")
                        year = date_elem.text if date_elem is not None and date_elem.text else "2024"

                        pmid_elem = article.find(".//PMID")
                        pmid = pmid_elem.text if pmid_elem is not None and pmid_elem.text else ""

                        papers.append({
                            "pmid": pmid,
                            "title": title,
                            "abstract": abstract[:500] + "..." if len(abstract) > 500 else abstract,
                            "authors": authors[:3],  # First 3 authors
                            "journal": journal,
                            "year": year,
                            "pubmed_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                        })

                    except Exception as parse_error:
                        continue

            return papers

        except Exception as e:
            return []

    def monitor_daily_research(self) -> Dict:
        """Monitor all research areas for today's publications."""
        results = {
            "monitoring_date": datetime.now().isoformat(),
            "total_papers": 0,
            "research_areas": {},
            "trending_topics": [],
            "key_insights": []
        }

        # Search each research area with proper error handling
        for area, keywords in self.research_areas.items():
            try:
                area_results = self.search_pubmed_recent(keywords, days=1)

                # Ensure area_results is not None
                if area_results is None:
                    area_results = {"success": False, "error": "No results returned"}

                results["research_areas"][area] = area_results

                if area_results.get("success", False):
                    results["total_papers"] += area_results.get("papers_found", 0)

            except Exception as e:
                results["research_areas"][area] = {
                    "success": False,
                    "error": f"Search failed: {e}",
                    "keyword_group": keywords
                }

        # Generate trending analysis with null checks
        try:
            results["trending_topics"] = self._identify_trending_topics(results["research_areas"])
            results["key_insights"] = self._generate_research_insights(results["research_areas"])
        except Exception as e:
            results["trending_topics"] = [f"Analysis error: {e}"]
            results["key_insights"] = ["Could not generate insights due to data issues"]

        return results

    def _identify_trending_topics(self, research_areas: Dict) -> List[str]:
        """Identify trending topics from today's papers."""
        trending = []

        if not research_areas:
            return ["No research areas to analyze"]

        for area, data in research_areas.items():
            if isinstance(data, dict) and data.get("success") and data.get("papers_found", 0) > 2:
                papers_count = data.get("papers_found", 0)
                trending.append(f"{area}: {papers_count} new papers")

        if not trending:
            trending.append("Low research activity today across all areas")

        return trending

    def _generate_research_insights(self, research_areas: Dict) -> List[str]:
        """Generate key insights from today's literature."""
        insights = []

        # High-activity areas
        high_activity = [area for area, data in research_areas.items()
                        if data.get("papers_found", 0) > 3]

        if high_activity:
            insights.append(f"High research activity in: {', '.join(high_activity)}")

        # Cross-domain opportunities
        if len(high_activity) > 2:
            insights.append(f"Cross-domain research opportunity: {high_activity[0]} + {high_activity[1]}")

        # Novel research gaps
        low_activity = [area for area, data in research_areas.items()
                       if data.get("papers_found", 0) == 0]

        if low_activity:
            insights.append(f"Research gap opportunities: {', '.join(low_activity)}")

        return insights

    def search_related_papers(self, user_query: str, max_papers: int = 10) -> Dict:
        """Search for papers related to user's specific research question."""
        try:
            # Enhanced query processing
            search_query = f'"{user_query}"[All Fields]'

            search_url = f"{self.pubmed_base}/esearch.fcgi"
            search_params = {
                "db": "pubmed",
                "term": search_query,
                "retmax": max_papers,
                "sort": "relevance",
                "email": self.email
            }

            response = requests.get(search_url, params=search_params, timeout=10)

            if response.status_code == 200:
                root = ET.fromstring(response.content)
                pmids = [id_elem.text for id_elem in root.findall(".//Id")]

                if pmids:
                    papers = self._fetch_paper_details(pmids)
                    return {
                        "success": True,
                        "query": user_query,
                        "papers_found": len(papers),
                        "papers": papers,
                        "research_summary": self._summarize_papers(papers)
                    }

            return {
                "success": True,
                "query": user_query,
                "papers_found": 0,
                "message": "No papers found for this query"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Literature search failed: {e}",
                "query": user_query
            }

    def _summarize_papers(self, papers: List[Dict]) -> str:
        """Generate research summary from paper abstracts."""
        if not papers:
            return "No papers to summarize"

        # Extract key terms from abstracts
        all_abstracts = " ".join([p.get("abstract", "") for p in papers])

        # Simple keyword extraction
        important_terms = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', all_abstracts)
        term_counts = {}
        for term in important_terms:
            if len(term) > 4:  # Skip short words
                term_counts[term] = term_counts.get(term, 0) + 1

        # Get top terms
        top_terms = sorted(term_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        summary = f"Research Summary ({len(papers)} papers):\n"
        summary += f"Key topics: {', '.join([term for term, count in top_terms[:5]])}\n"
        summary += f"Most cited journals: {', '.join(set([p.get('journal', 'Unknown')[:30] for p in papers[:3]]))}\n"

        return summary

# Global instance
literature_monitor = LiteratureIntelligence()