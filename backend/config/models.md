# Model Endpoints and Configuration

## Azure OpenAI Models

### GPT 4.1
- **Endpoint**: `https://mandrakebioworkswestus.openai.azure.com/`
- **Deployment**: `gpt-4.1`
- **API Version**: `2024-12-01-preview`
- **Full URL**: `https://mandrakebioworkswestus.openai.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview`

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    api_version="2024-12-01-preview",
    azure_endpoint="https://mandrakebioworkswestus.openai.azure.com/",
    api_key=subscription_key
)

response = client.chat.completions.create(
    messages=[{"role": "system", "content": "You are a helpful assistant."}],
    model="gpt-4.1",
    max_completion_tokens=800,
    temperature=1.0,
    top_p=1.0,
    frequency_penalty=0.0,
    presence_penalty=0.0
)
```

### GPT o4-Mini
- **Endpoint**: `https://mandrakebioworkswestus.openai.azure.com/`
- **Deployment**: `o4-mini`
- **API Version**: `2024-12-01-preview`
- **Full URL**: `https://mandrakebioworkswestus.openai.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview`

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    api_version="2024-12-01-preview",
    azure_endpoint="https://mandrakebioworkswestus.openai.azure.com/",
    api_key=subscription_key
)
```

## DeepSeek R1

- **Endpoint**: `https://mandrake-resource.services.ai.azure.com/models`
- **Model Name**: `DeepSeek-R1-0528`
- **API Version**: `2024-05-01-preview`
- **Full URL**: `https://mandrake-resource.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview`
- **Note**: Requires separate Azure API key from OpenAI models

```python
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential

client = ChatCompletionsClient(
    endpoint="https://mandrake-resource.services.ai.azure.com/models",
    credential=AzureKeyCredential("<API_KEY>"),
    api_version="2024-05-01-preview"
)

response = client.complete(
    messages=[
        SystemMessage(content="You are a helpful assistant."),
        UserMessage(content="Your query here"),
    ],
    max_tokens=2048,
    model="DeepSeek-R1-0528"
)
```

## Google Vertex AI Models

### Prerequisites
```bash
pip install --upgrade google-genai
gcloud auth application-default login
```

### Gemini 2.5 Pro
- **Project**: `bioagent-1753275345877`
- **Location**: `global`
- **Model**: `gemini-2.5-pro`

```python
from google import genai
from google.genai import types

client = genai.Client(
    vertexai=True,
    project="bioagent-1753275345877",
    location="global",
)

model = "gemini-2.5-pro"
contents = [types.Content(role="user", parts=[])]

generate_content_config = types.GenerateContentConfig(
    temperature=1,
    top_p=0.95,
    seed=0,
    max_output_tokens=65535,
    safety_settings=[
        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
    ],
    thinking_config=types.ThinkingConfig(thinking_budget=-1),
)

for chunk in client.models.generate_content_stream(
    model=model,
    contents=contents,
    config=generate_content_config,
):
    print(chunk.text, end="")
```

### Gemini 2.5 Flash
- **Project**: `bioagent-1753275345877`
- **Location**: `global`
- **Model**: `gemini-2.5-flash`

```python
from google import genai
from google.genai import types

client = genai.Client(
    vertexai=True,
    project="bioagent-1753275345877",
    location="global",
)

model = "gemini-2.5-flash"
contents = [types.Content(role="user", parts=[])]

generate_content_config = types.GenerateContentConfig(
    temperature=1,
    top_p=1,
    seed=0,
    max_output_tokens=65535,
    safety_settings=[
        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF")
    ],
    thinking_config=types.ThinkingConfig(thinking_budget=-1),
)

for chunk in client.models.generate_content_stream(
    model=model,
    contents=contents,
    config=generate_content_config,
):
    print(chunk.text, end="")
```

## Anthropic Models via Google Vertex AI

### Prerequisites
1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set application default credentials: `gcloud auth application-default login`

**Note**: Unlike Gemini models which can use API keys directly, Anthropic models through Vertex AI require proper Google Cloud authentication via gcloud.

### Claude Sonnet 4
- **Endpoint**: `us-east5-aiplatform.googleapis.com`
- **Location**: `us-east5`
- **Project**: `bioagent-1753275345877`
- **Model**: `claude-sonnet-4`

```bash
cat << EOF > request.json
{
    "anthropic_version": "vertex-2023-10-16",
    "stream": false,
    "max_tokens": 512,
    "temperature": 0.5,
    "top_p": 0.95,
    "top_k": 1,
    "messages": [
        {
            "role": "user",
            "content": []
        }
    ]
}
EOF

ENDPOINT="us-east5-aiplatform.googleapis.com"
LOCATION_ID="us-east5"
PROJECT_ID="bioagent-1753275345877"
MODEL_ID="claude-sonnet-4"
METHOD="rawPredict"

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @request.json \
"https://${ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/anthropic/models/${MODEL_ID}:${METHOD}"
```

### Claude 3.5 Haiku
- **Endpoint**: `us-east5-aiplatform.googleapis.com`
- **Location**: `us-east5`
- **Project**: `bioagent-1753275345877`
- **Model**: `claude-3-5-haiku`

```bash
cat << EOF > request.json
{
    "anthropic_version": "vertex-2023-10-16",
    "stream": false,
    "max_tokens": 512,
    "temperature": 0.5,
    "top_p": 0.95,
    "top_k": 1,
    "messages": [
        {
            "role": "user",
            "content": []
        }
    ]
}
EOF

ENDPOINT="us-east5-aiplatform.googleapis.com"
LOCATION_ID="us-east5"
PROJECT_ID="bioagent-1753275345877"
MODEL_ID="claude-3-5-haiku"
METHOD="rawPredict"

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @request.json \
"https://${ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION_ID}/publishers/anthropic/models/${MODEL_ID}:${METHOD}"
```

## Important Notes

1. **API Keys**: 
   - Azure OpenAI models (GPT 4.1, o4-Mini) share the same endpoint and API key
   - DeepSeek R1 requires a separate Azure API key
   - Gemini models use Google Cloud authentication (gcloud auth)
   - Anthropic models via Vertex AI require gcloud authentication (API keys not sufficient)

2. **Tool/Function Calling**: 
   - For OpenAI APIs, refer to: https://platform.openai.com/docs/guides/tools?api-mode=responses
   - Follow best practices for tool calling and function calling

3. **Authentication Methods**:
   - **Azure OpenAI & DeepSeek**: API key based
   - **Gemini**: Google Cloud SDK with application default credentials
   - **Anthropic via Vertex**: Google Cloud SDK with bearer token authentication