import os
import yaml

# Finance Records
finance_records = [
    {
        "name": "OpenBB Platform",
        "repo": "OpenBB-finance/OpenBB",
        "url": "https://github.com/OpenBB-finance/OpenBB",
        "desc": "An open-source financial analysis toolkit that integrates with nearly 100 different data providers.",
        "stars": 30000,
        "forks": 3000,
        "topics": ["finance", "trading", "investment", "analytics"]
    },
    {
        "name": "FinGPT",
        "repo": "AI4Finance-Foundation/FinGPT",
        "url": "https://github.com/AI4Finance-Foundation/FinGPT",
        "desc": "Open-source financial Large Language Models (LLMs) to democratize financial AI.",
        "stars": 18000,
        "forks": 2500,
        "topics": ["finance", "ai", "llm", "fintech"]
    },
    {
        "name": "Hyperswitch",
        "repo": "juspay/hyperswitch",
        "url": "https://github.com/juspay/hyperswitch",
        "desc": "An open-source payment switch written in Rust, designed for fast, reliable, and affordable payments.",
        "stars": 40000,
        "forks": 1500,
        "topics": ["payments", "rust", "fintech", "infrastructure"]
    },
    {
        "name": "vn.py",
        "repo": "vnpy/vnpy",
        "url": "https://github.com/vnpy/vnpy",
        "desc": "Python-based open-source quantitative trading platform development framework.",
        "stars": 35000,
        "forks": 12000,
        "topics": ["trading", "quant", "finance", "python"]
    },
    {
        "name": "FinRL",
        "repo": "AI4Finance-Foundation/FinRL",
        "url": "https://github.com/AI4Finance-Foundation/FinRL",
        "desc": "Deep Reinforcement Learning (DRL) framework for financial trading and wealth management.",
        "stars": 13000,
        "forks": 2000,
        "topics": ["finance", "ai", "trading", "reinforcement-learning"]
    },
    {
        "name": "Akaunting",
        "repo": "akaunting/akaunting",
        "url": "https://github.com/akaunting/akaunting",
        "desc": "Free and open-source online accounting software designed for small businesses and freelancers.",
        "stars": 9500,
        "forks": 1500,
        "topics": ["accounting", "finance", "php", "erp"]
    },
    {
        "name": "Lago",
        "repo": "getlago/lago",
        "url": "https://github.com/getlago/lago",
        "desc": "Open-source metering and usage-based billing API, a low-code alternative to Stripe Billing.",
        "stars": 9000,
        "forks": 800,
        "topics": ["billing", "payments", "fintech", "saas"]
    },
    {
        "name": "Ghostfolio",
        "repo": "ghostfolio/ghostfolio",
        "url": "https://github.com/ghostfolio/ghostfolio",
        "desc": "Open-source web-based wealth management application to track financial assets like stocks, ETFs or cryptos.",
        "stars": 7500,
        "forks": 1000,
        "topics": ["wealth-management", "finance", "analytics", "self-hosted"]
    },
    {
        "name": "Apache Fineract",
        "repo": "apache/fineract",
        "url": "https://github.com/apache/fineract",
        "desc": "A secure, multi-tenanted system that provides core banking functions for financial institutions.",
        "stars": 2000,
        "forks": 1400,
        "topics": ["banking", "finance", "java", "fintech"]
    },
    {
        "name": "OpenMeter",
        "repo": "openmeterio/openmeter",
        "url": "https://github.com/openmeterio/openmeter",
        "desc": "Open-source cloud cost and usage metering for AI, API, and DevOps platforms.",
        "stars": 1800,
        "forks": 200,
        "topics": ["billing", "fintech", "infrastructure", "devops"]
    }
]

# Medical Records
medical_records = [
    {
        "name": "MONAI",
        "repo": "Project-MONAI/MONAI",
        "url": "https://github.com/Project-MONAI/MONAI",
        "desc": "Medical Open Network for AI (MONAI) is a PyTorch-based framework for deep learning in healthcare imaging.",
        "stars": 5500,
        "forks": 1500,
        "topics": ["medical-imaging", "ai", "healthcare", "pytorch"]
    },
    {
        "name": "AlphaGenome",
        "repo": "google-deepmind/alphagenome",
        "url": "https://github.com/google-deepmind/alphagenome",
        "desc": "A unified DNA sequence model for regulatory variant-effect prediction and genome function research.",
        "stars": 1400,
        "forks": 200,
        "topics": ["genomics", "ai", "biomedical", "google-deepmind"]
    },
    {
        "name": "AntAngelMed",
        "repo": "MedAIBase/AntAngelMed",
        "url": "https://github.com/MedAIBase/AntAngelMed",
        "desc": "Open-source medical large language model demonstrating deep medical knowledge and safety compliance.",
        "stars": 117,
        "forks": 10,
        "topics": ["medical-ai", "llm", "healthcare", "safety"]
    },
    {
        "name": "HuatuoGPT-Vision",
        "repo": "FreedomIntelligence/HuatuoGPT-Vision",
        "url": "https://github.com/FreedomIntelligence/HuatuoGPT-Vision",
        "desc": "A Medical Multimodal LLM capable of processing and understanding medical images and text.",
        "stars": 372,
        "forks": 50,
        "topics": ["medical-ai", "multimodal", "healthcare", "vision"]
    },
    {
        "name": "Nilearn",
        "repo": "nilearn/nilearn",
        "url": "https://github.com/nilearn/nilearn",
        "desc": "Python module for fast and easy statistical learning on NeuroImaging data.",
        "stars": 1200,
        "forks": 600,
        "topics": ["neuroimaging", "medical", "science", "python"]
    },
    {
        "name": "SimpleITK",
        "repo": "SimpleITK/SimpleITK",
        "url": "https://github.com/SimpleITK/SimpleITK",
        "desc": "Simplified interface to the Insight Segmentation and Registration Toolkit (ITK) for medical imaging.",
        "stars": 1100,
        "forks": 450,
        "topics": ["medical-imaging", "image-processing", "itk", "science"]
    },
    {
        "name": "DIPY",
        "repo": "dipy/dipy",
        "url": "https://github.com/dipy/dipy",
        "desc": "Diffusion Imaging in Python (DIPY) is an open-source library for analysis of magnetic resonance imaging.",
        "stars": 500,
        "forks": 350,
        "topics": ["mri", "medical-imaging", "neuroscience", "python"]
    },
    {
        "name": "MedAIBench",
        "repo": "FreedomIntelligence/MedAIBench",
        "url": "https://github.com/FreedomIntelligence/MedAIBench",
        "desc": "A comprehensive benchmark for evaluating Medical AI models across diverse tasks.",
        "stars": 250,
        "forks": 30,
        "topics": ["medical-ai", "benchmark", "healthcare", "nlp"]
    },
    {
        "name": "Awesome-AI4Med",
        "repo": "FreedomIntelligence/Awesome-AI4Med",
        "url": "https://github.com/FreedomIntelligence/Awesome-AI4Med",
        "desc": "A curated list of research resources in the field of medical artificial intelligence.",
        "stars": 2500,
        "forks": 400,
        "topics": ["medical-ai", "awesome-list", "healthcare", "research"]
    },
    {
        "name": "Sci_LLM",
        "repo": "LLMs-in-science/Sci_LLM",
        "url": "https://github.com/LLMs-in-science/Sci_LLM",
        "desc": "Framework for LLM-based knowledge synthesis and scientific reasoning in biomedical discovery.",
        "stars": 283,
        "forks": 40,
        "topics": ["biomedical", "ai", "science", "knowledge-synthesis"]
    }
]

def save_records(records, directory, domain_name):
    os.makedirs(directory, exist_ok=True)
    for r in records:
        filename = r['repo'].split('/')[-1].lower() + ".yaml"
        filepath = os.path.join(directory, filename)
        
        data = {
            "schema_version": "1.0",
            "record": {
                "name": r['name'],
                "repo_url": r['url']
            },
            "domain": domain_name,
            "category": "infrastructure" if "infrastructure" in r['topics'] or "fintech" in r['topics'] or "ai" in r['topics'] else "analytics",
            "description": r['desc'],
            "evidence": {
                "github": {
                    "stars": r['stars'],
                    "forks": r['forks'],
                    "topics": r['topics']
                }
            },
            "status": "active"
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, sort_keys=False, default_flow_style=False, allow_unicode=True)
        print(f"Saved: {filepath}")

# Main execution
save_records(finance_records, "d:/Dropbox/Project/OpenIndex/finance", "finance")
save_records(medical_records, "d:/Dropbox/Project/OpenIndex/health", "health")
