with open('children_edge_ai.py', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Build the exact old segment line by line
old_lines = [
    'def classify_emotion(self, model_id: str, text: str) -> InferenceResult:',
    '        """Emotion classification from text."""',
    '        inst = self._instances.get(model_id)',
    '        if not inst or not inst.tokenizer:',
    '            return InferenceResult(model_id=model_id, success=False, error="Model/tokenizer not loaded")',
    '        ',
    '        encoding = inst.tokenizer.encode(text)',
    '        input_ids = np.array([encoding.ids], dtype=np.int64)',
    '        attention_mask = np.array([encoding.attention_mask], dtype=np.int64)',
    '        ',
    '        result = self.infer(model_id, {"input_ids": input_ids, "attention_mask": attention_mask})',
    '        ',
    '        if result.success and "logits" in result.output:',
    '            logits = result.output["logits"][0]',
    '            probs = self._softmax(logits)',
    '            emotions = ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"]',
    '            result.output = {',
    '                "emotions": {e: float(p) for e, p in zip(emotions, probs)},',
    '                "top": emotions[int(np.argmax(probs))]',
    '            }',
    '        return result',
    '    def filter_content'
]
old_segment = '\n'.join(old_lines)

new_lines = [
    'def classify_emotion(self, model_id: str, text: str) -> InferenceResult:',
    '        """Emotion classification from text.',
    '',
    '        ⚠️ EU AI Act Art. 5 PROHIBITS emotion recognition in toys/education.',
    '        This method is DISABLED for EU deployments. Use only in non-EU markets',
    '        with explicit legal review.',
    '        """',
    '        # EU AI Act Art. 5 ban: emotion recognition in workplace/education/toys',
    '        # Check deployment region - for EU, return hard error',
    '        import os',
    '        if os.getenv("DEPLOYMENT_REGION", "EU").upper() == "EU":',
    '            return InferenceResult(',
    '                model_id=model_id,',
    '                success=False,',
    '                error="EMOTION_RECOGNITION_BANNED: EU AI Act Art. 5 prohibits emotion recognition in toys/education. Set DEPLOYMENT_REGION=non-EU to enable (requires legal review)."',
    '            )',
    '        inst = self._instances.get(model_id)',
    '        if not inst or not inst.tokenizer:',
    '            return InferenceResult(model_id=model_id, success=False, error="Model/tokenizer not loaded")',
    '',
    '        encoding = inst.tokenizer.encode(text)',
    '        input_ids = np.array([encoding.ids], dtype=np.int64)',
    '        attention_mask = np.array([encoding.attention_mask], dtype=np.int64)',
    '',
    '        result = self.infer(model_id, {"input_ids": input_ids, "attention_mask": attention_mask})',
    '',
    '        if result.success and "logits" in result.output:',
    '            logits = result.output["logits"][0]',
    '            probs = self._softmax(logits)',
    '            emotions = ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"]',
    '            result.output = {',
    '                "emotions": {e: float(p) for e, p in zip(emotions, probs)},',
    '                "top": emotions[int(np.argmax(probs))]',
    '            }',
    '        return result',
    '    def filter_content'
]
new_segment = '\n'.join(new_lines)

if old_segment in content:
    content = content.replace(old_segment, new_segment)
    with open('children_edge_ai.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully!')
else:
    print('Old segment not found - checking...')
    # Debug: compare line by line
    idx = content.find('def classify_emotion')
    end = content.find('def filter_content', idx)
    actual = content[idx:end]
    print('Actual segment length:', len(actual))
    print('Expected segment length:', len(old_segment))
    for i, (a, b) in enumerate(zip(actual.split('\n'), old_segment.split('\n'))):
        if a != b:
            print(f'Line {i} mismatch:')
            print(f'  Actual:   {repr(a)}')
            print(f'  Expected: {repr(b)}')
            break
    else:
        if len(actual.split('\n')) != len(old_segment.split('\n')):
            print(f'Line count mismatch: actual={len(actual.split(chr(10)))}, expected={len(old_segment.split(chr(10)))}')