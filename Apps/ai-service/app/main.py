from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="ai-mentor-os-ai-service", version="0.1.0")


class EchoRequest(BaseModel):
    prompt: str


class EchoResponse(BaseModel):
    prompt: str
    response: str


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/api/echo", response_model=EchoResponse)
def echo(payload: EchoRequest):
    return EchoResponse(prompt=payload.prompt, response=f"Echo: {payload.prompt}")
