#!/usr/bin/env python3
"""
Drug Discovery Intelligence Hub using Free APIs
ChEMBL, UniProt, and chemical databases for drug discovery insights.
"""

import requests
import json
from typing import List, Dict
import urllib.parse

class DrugDiscoveryIntelligence:
    """Free API integration for drug discovery research."""

    def __init__(self):
        # Free APIs for drug discovery
        self.chembl_base = "https://www.ebi.ac.uk/chembl/api/data"
        self.uniprot_base = "https://rest.uniprot.org"
        self.pubchem_base = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
        self.chebi_base = "https://www.ebi.ac.uk/chebi/webServices/rest"

    def find_drugs_for_target(self, target_name: str, max_results: int = 10) -> Dict:
        """Find drugs and compounds targeting a specific protein."""
        try:
            # Search ChEMBL for target
            target_search_url = f"{self.chembl_base}/target/search"
            target_params = {"q": target_name, "format": "json"}

            response = requests.get(target_search_url, params=target_params, timeout=10)

            if response.status_code == 200:
                targets = response.json()

                if targets.get("targets"):
                    target_id = targets["targets"][0]["target_chembl_id"]

                    # Get bioactivity data for this target
                    activity_url = f"{self.chembl_base}/activity"
                    activity_params = {
                        "target_chembl_id": target_id,
                        "limit": max_results,
                        "format": "json"
                    }

                    activity_response = requests.get(activity_url, params=activity_params, timeout=15)

                    if activity_response.status_code == 200:
                        activities = activity_response.json()

                        # Process compound data with proper error handling
                        compounds = []
                        for activity in activities.get("activities", []):
                            compound_id = activity.get("molecule_chembl_id")
                            if compound_id:
                                try:
                                    compound_info = self._get_compound_details(compound_id)
                                    compound_info["activity_data"] = {
                                        "activity_type": activity.get("standard_type", ""),
                                        "activity_value": activity.get("standard_value", ""),
                                        "activity_units": activity.get("standard_units", ""),
                                        "assay_type": activity.get("assay_type", "")
                                    }
                                    compounds.append(compound_info)
                                except Exception as e:
                                    # Skip problematic compounds rather than failing entire request
                                    continue

                        return {
                            "success": True,
                            "target_name": target_name,
                            "target_id": target_id,
                            "compounds_found": len(compounds),
                            "compounds": compounds,
                            "analysis": self._analyze_drug_profile(compounds)
                        }

            return {
                "success": False,
                "error": f"No targets found for: {target_name}",
                "suggestion": "Try alternative target names or protein symbols"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Drug search failed: {e}",
                "target_name": target_name
            }

    def _get_compound_details(self, chembl_id: str) -> Dict:
        """Get detailed compound information from ChEMBL."""
        try:
            compound_url = f"{self.chembl_base}/molecule/{chembl_id}"
            response = requests.get(compound_url, params={"format": "json"}, timeout=10)

            if response.status_code == 200:
                data = response.json()
                compound = data.get("molecule_structures", {})

                return {
                    "chembl_id": chembl_id,
                    "name": data.get("pref_name", "Unknown"),
                    "smiles": compound.get("canonical_smiles", ""),
                    "molecular_weight": data.get("molecule_properties", {}).get("mw_freebase"),
                    "drug_type": data.get("molecule_type", ""),
                    "max_phase": data.get("max_phase", 0),
                    "indication_class": data.get("indication_class", "")
                }

        except Exception:
            return {"chembl_id": chembl_id, "error": "Could not fetch details"}

    def _analyze_drug_profile(self, compounds: List[Dict]) -> Dict:
        """Analyze drug discovery profile for target."""
        if not compounds:
            return {"message": "No compounds to analyze"}

        # Analyze drug development phases
        phases = [c.get("max_phase", 0) for c in compounds if c.get("max_phase")]
        avg_phase = sum(phases) / len(phases) if phases else 0

        # Analyze molecular weights
        mw_values = [c.get("molecular_weight") for c in compounds if c.get("molecular_weight")]
        avg_mw = sum(mw_values) / len(mw_values) if mw_values else 0

        # Drug type distribution
        drug_types = {}
        for c in compounds:
            dtype = c.get("drug_type", "Unknown")
            drug_types[dtype] = drug_types.get(dtype, 0) + 1

        return {
            "average_development_phase": round(avg_phase, 1),
            "average_molecular_weight": round(avg_mw, 1),
            "drug_type_distribution": drug_types,
            "total_compounds": len(compounds),
            "druggability_assessment": "High" if avg_phase > 2 else "Medium" if avg_phase > 1 else "Low"
        }

    def search_similar_compounds(self, smiles: str, similarity_threshold: float = 0.8) -> Dict:
        """Search for chemically similar compounds using PubChem."""
        try:
            # PubChem similarity search
            search_url = f"{self.pubchem_base}/compound/fastsimilarity_2d/smiles/{urllib.parse.quote(smiles)}/JSON"
            search_params = {"Threshold": int(similarity_threshold * 100)}

            response = requests.get(search_url, params=search_params, timeout=15)

            if response.status_code == 200:
                data = response.json()
                cids = data.get("IdentifierList", {}).get("CID", [])

                if cids:
                    # Get compound details for first 5 similar compounds
                    similar_compounds = []
                    for cid in cids[:5]:
                        compound_info = self._get_pubchem_compound(cid)
                        similar_compounds.append(compound_info)

                    return {
                        "success": True,
                        "query_smiles": smiles,
                        "similarity_threshold": similarity_threshold,
                        "similar_compounds_found": len(similar_compounds),
                        "compounds": similar_compounds
                    }

            return {
                "success": False,
                "error": "No similar compounds found",
                "suggestion": "Try lower similarity threshold"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Similarity search failed: {e}"
            }

    def _get_pubchem_compound(self, cid: str) -> Dict:
        """Get compound details from PubChem."""
        try:
            detail_url = f"{self.pubchem_base}/compound/cid/{cid}/property/MolecularWeight,MolecularFormula,CanonicalSMILES/JSON"

            response = requests.get(detail_url, timeout=10)

            if response.status_code == 200:
                data = response.json()
                props = data.get("PropertyTable", {}).get("Properties", [{}])[0]

                return {
                    "pubchem_cid": cid,
                    "molecular_weight": props.get("MolecularWeight"),
                    "molecular_formula": props.get("MolecularFormula"),
                    "smiles": props.get("CanonicalSMILES"),
                    "pubchem_url": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"
                }

        except Exception:
            return {"pubchem_cid": cid, "error": "Could not fetch details"}

    def get_target_information(self, protein_name: str) -> Dict:
        """Get comprehensive target information from UniProt."""
        try:
            # UniProt search
            search_url = f"{self.uniprot_base}/uniprotkb/search"
            search_params = {
                "query": f"protein_name:{protein_name} AND reviewed:true",
                "format": "json",
                "size": 5
            }

            response = requests.get(search_url, params=search_params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])

                if results:
                    protein = results[0]

                    return {
                        "success": True,
                        "protein_name": protein_name,
                        "uniprot_id": protein.get("primaryAccession"),
                        "gene_names": protein.get("genes", [{}])[0].get("geneName", {}).get("value"),
                        "organism": protein.get("organism", {}).get("scientificName"),
                        "function": protein.get("comments", [{}])[0].get("texts", [{}])[0].get("value", "")[:200],
                        "keywords": [kw.get("value") for kw in protein.get("keywords", [])[:5]],
                        "subcellular_location": protein.get("comments", [{}])[1].get("texts", [{}])[0].get("value", "")[:100] if len(protein.get("comments", [])) > 1 else "Unknown"
                    }

            return {
                "success": False,
                "error": f"No UniProt entry found for: {protein_name}",
                "suggestion": "Try alternative protein names or gene symbols"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"UniProt search failed: {e}"
            }

# Global instance
drug_discovery_hub = DrugDiscoveryIntelligence()