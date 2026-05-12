FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    scikit-learn \
    joblib \
    pandas \
    numpy \
    pydantic

# Copy model server and trained models
COPY api/model_server.py api/model_server.py
COPY models/ models/

EXPOSE 8000

CMD ["uvicorn", "api.model_server:app", "--host", "0.0.0.0", "--port", "8000"]
