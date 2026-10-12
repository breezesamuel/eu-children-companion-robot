with open('children_edge_ai.py', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

old_segment = '''def classify_emotion(self, model_id: str, text: str) -> InferenceResult:
        """Emotion classification from text."""
        inst = self._instances.get(model_id)
        if not inst or not inst.tokenizer:
            return InferenceResult(model_id=model_id, success=False, error="Model/tokenizer not loaded")

        encoding = inst.tokenizer.encode(text)
        input_ids = np.array([encoding.ids], dtype=np.int64)
        attention_mask = np.array([encoding.attention_mask], dtype=np.int64)

        result = self.infer(model_id, {"input_ids": input_ids, "attention_mask": attention_mask})

        if result.success and "logits" in result.output:
            logits = result.output["logits"][0]
            probs = self._softmax(logits)
            emotions = ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"]
            result.output = {
                "emotions": {e: float(p) for e, p in zip(emotions, probs)},
                "top": emotions[int(np.argmax(probs))]
            }
        return result

    def filter_content'''

new_segment = '''def classify_emotion(self, model_id: str, text: str) -> InferenceResult:
        """Emotion classification from text.

        ⚠️ EU AI Act Art. 5 PROHIBITS emotion recognition in toys/education.
        This method is DISABLED for EU deployments. Use only in non-EU markets
        with explicit legal review.
        """
        # EU AI Act Art. 5 ban: emotion recognition in workplace/education/toys
        # Check deployment region - for EU, return hard error
        import os
        if os.getenv("DEPLOYMENT_REGION", "EU").upper() == "EU":
            return InferenceResult(
                model_id=model_id,
                success=False,
                error="EMOTION_RECOGNITION_BANNED: EU AI Act Art. 5 prohibits emotion recognition in toys/education. Set DEPLOYMENT_REGION=non-EU to enable (requires legal review)."
            )
        inst = self._instances.get(model_id)
        if not inst or not inst.tokenizer:
            return InferenceResult(model_id=model_id, success=False, error="Model/tokenizer not loaded")

        encoding = inst.tokenizer.encode(text)
        input_ids = np.array([encoding.ids], dtype=np.int64)
        attention_mask = np.array([encoding.attention_mask], dtype=np.int64)

        result = self.infer(model_id, {"input_ids": input_ids, "attention_mask": attention_mask})

        if result.success and "logits" in result.output:
            logits = result.output["logits"][0]
            probs = self._softmax(logits)
            emotions = ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"]
            result.output = {
                "emotions": {e: float(p) for e, p in zip(emotions, probs)},
                "top": emotions[int(np.argmax(probs))]
            }
        return result

    def filter_content'''

if old_segment in content:
    content = content.replace(old_segment, new_segment)
    with open('children_edge_ai.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully!')
else:
    print('Old segment not found')
    idx = content.find('def classify_emotion')
    end = content.find('def filter_content', idx)
    print(f'Found at {idx}, end at {content.find("def filter_content", idx)}')
    print('First 200 chars of segment:')
    print(repr(content[idx:idx+300]))