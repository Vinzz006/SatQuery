import json
from pathlib import Path
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report, accuracy_score

from adaptation.dataset import RemoteSensingBenchmarkDataset, EUROSAT_CLASSES
from adaptation.train import RemoteSensingAdapterHead


def evaluate_adapted_model():
    print("==================================================================")
    print("SATQUERY AI — REMOTE SENSING MODEL EVALUATION")
    print("Evaluating Adapted Checkpoint vs Ground-Truth Remote Sensing Test Split")
    print("==================================================================")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    chk_path = Path(__file__).resolve().parent.parent.parent / "models" / "checkpoints" / "adapted_rs_head.pt"

    if not chk_path.exists():
        print(f"Checkpoint not found at {chk_path}. Please run train.py first.")
        return

    model = RemoteSensingAdapterHead().to(device)
    model.load_state_dict(torch.load(chk_path, map_location=device))
    model.eval()

    test_ds = RemoteSensingBenchmarkDataset(num_samples=100, img_size=(64, 64))
    test_loader = DataLoader(test_ds, batch_size=16, shuffle=False)

    all_preds = []
    all_targets = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())

    acc = accuracy_score(all_targets, all_preds)
    report = classification_report(all_targets, all_preds, target_names=EUROSAT_CLASSES, zero_division=0)

    print(f"Test Accuracy: {acc * 100:.2f}%\n")
    print("Classification Metrics by Remote Sensing Class:")
    print(report)

    eval_out = {
        "test_accuracy": round(acc * 100, 2),
        "total_test_samples": len(test_ds),
        "status": "verified"
    }
    return eval_out


if __name__ == "__main__":
    evaluate_adapted_model()
