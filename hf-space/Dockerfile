# Two stages: torch is needed only to build the pruned ONNX model; the served image has onnxruntime.
# The model is built here because the file (~190 MB) is too large for the GitHub repository.

FROM python:3.12-slim AS export
WORKDIR /build
COPY requirements-export.txt .
RUN pip install --no-cache-dir -r requirements-export.txt
ARG EMBED_MODEL=sdadas/mmlw-e5-base
ENV EMBED_MODEL=$EMBED_MODEL
COPY export_onnx.py .
RUN python export_onnx.py /build/model

FROM python:3.12-slim
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
COPY --chown=user --from=export /build/model ./model
COPY --chown=user app.py .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
