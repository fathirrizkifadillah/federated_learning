# Federated Personalized Product Recommendation System

A research-oriented implementation of a privacy-preserving product recommendation system using Federated Learning and Amazon Reviews 2023.

## Overview

This project explores the implementation of a personalized product recommendation system using **Federated Learning (FL)**.

Traditional recommendation systems typically collect user interaction data in a centralized environment to train a global model. While this approach can be effective, it introduces challenges related to data privacy, data ownership, and centralized data management.

Federated Learning offers an alternative approach. Instead of transferring raw user interaction data to a central server, individual clients train models locally and share model updates for global aggregation.

The objective of this project is to investigate how Federated Learning can support personalized product recommendations while maintaining decentralized data storage.

## Research Objectives

The project focuses on the following objectives:

- Implement a product recommendation model using user-item interaction data.
- Apply Federated Learning to train recommendation models across multiple clients.
- Investigate the impact of non-IID data distribution on federated recommendation performance.
- Compare centralized and federated training approaches.
- Evaluate recommendation quality, communication overhead, and personalization performance.
- Explore privacy-enhancing techniques for federated recommendation systems.

## Dataset

**Amazon Reviews 2023**

The project uses the Amazon Reviews 2023 dataset released by the McAuley Lab at the University of California, San Diego.

The dataset contains large-scale user reviews, product ratings, timestamps, and product metadata across multiple product categories.

Dataset source:

- [Amazon Reviews 2023 — Official Dataset](https://amazon-reviews-2023.github.io/)

For computational efficiency, the project will initially focus on a selected product category rather than processing the entire dataset.

The selected data will be filtered and transformed into user-item interactions for recommendation model training.

## System Architecture

The system follows a federated client-server architecture.

```text
                  Federated Server
                         |
              Global Model Aggregation
                         |
             Model Parameters / Updates
                         |
          +--------------+--------------+
          |              |              |
       Client 1       Client 2       Client N
          |              |              |
      Local Data     Local Data     Local Data
          |              |              |
      Local Model    Local Model    Local Model
          |              |              |
      Local Train    Local Train    Local Train
          |              |              |
          +--------------+--------------+
                         |
                  Model Updates
                         |
                  Federated Server
```

### Core Components

**1. Data Processing**

- Dataset loading and exploration.
- Data cleaning and filtering.
- User-item interaction construction.
- Client data partitioning.
- Training, validation, and test preparation.

**2. Recommendation Model**

The initial recommendation model will use Matrix Factorization with Bayesian Personalized Ranking (BPR).

The model learns latent representations of users and products to estimate user preferences and rank relevant products.

**3. Federated Learning**

Multiple clients train recommendation models using their respective local datasets.

The central server aggregates model updates using Federated Averaging (FedAvg).

Additional federated optimization and personalization strategies will be explored in subsequent experiments.

**4. Evaluation**

The system will be evaluated using recommendation quality metrics and federated learning performance measurements.

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | Main programming language |
| PyTorch | Deep learning and recommendation models |
| Flower | Federated Learning framework |
| Pandas | Data processing |
| NumPy | Numerical computation |
| scikit-learn | Data preprocessing and utilities |
| Matplotlib | Data visualization |
| Streamlit | Experimental dashboard |
| Docker | Experiment environment management |
| Git | Version control |

## Planned Experiments

The following experiments are planned:

| Experiment | Description |
|---|---|
| Centralized Training | Train a recommendation model using centralized data |
| Local-only Training | Train independent models on individual clients |
| FedAvg | Federated training using Federated Averaging |
| FedProx | Federated optimization under heterogeneous data |
| Personalized FL | Investigate personalization strategies |

The experiments will examine both IID and non-IID data distributions.

### Evaluation Metrics

**Recommendation Metrics**
- Recall@K
- NDCG@K
- Hit Rate@K

**Federated Learning Metrics**
- Training time
- Communication cost
- Convergence behavior
- Performance across clients

## Project Structure

```text
federated-recommender/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── partitions/
│
├── preprocessing/
├── models/
├── clients/
├── server/
├── strategies/
├── evaluation/
├── experiments/
├── dashboard/
├── configs/
├── tests/
├── results/
│
├── requirements.txt
└── README.md
```

The directory structure may evolve as the implementation progresses.

## Development Status

<pre>
[ ] Dataset acquisition and exploration
[ ] Data preprocessing
[ ] Centralized recommendation baseline
[ ] Federated client implementation
[ ] FedAvg implementation
[ ] Non-IID experiments
[ ] FedProx implementation
[ ] Personalized Federated Learning
[ ] Performance evaluation
[ ] Experimental dashboard
[ ] Documentation and final analysis
</pre>

This project is currently in the planning and initial development stage. The architecture, experimental configurations, and implementation details may change as the research progresses.

## Research Scope

The primary focus is on the intersection of:

- Recommender Systems
- Federated Learning
- Distributed Optimization
- Personalized Machine Learning
- Privacy-Preserving Machine Learning

The project is intended as an experimental research implementation, not a production-ready recommendation service.

---

**Project:** Federated Personalized Product Recommendation System  
**Dataset:** Amazon Reviews 2023  
**Framework:** PyTorch + Flower  
**Status:** In Development