import os
import json
import time
from pathlib import Path
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split

from adaptation.dataset import RemoteSensingBenchmarkDataset, EUROSAT_CLASSES


class RemoteSensingAdapterHead(nn.Module):
    """
    Lightweight Vision-Language adaptation head for remote sensing LULC classification.
    Can be loaded directly into SatQuery AI's VQA specialist to replace or augment base predictions.
    """
    def __init__(self, num_classes: int = len(EUROSAT_CLASSES)):
        super().__init__()
        self.conv_block = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.conv_block(x)
        logits = self.classifier(feat)
        return logits


def train_adaptation_pipeline(epochs: int = 5, lr: float = 0.001, batch_size: int = 16):
    print("==================================================================")
    print("SATQUERY AI — REMOTE SENSING MODEL ADAPTATION PIPELINE")
    print("Target Benchmark: EuroSAT Multispectral LULC Classification")
    print("==================================================================")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Executing on hardware device: {device}")

    # Prepare datasets
    dataset = RemoteSensingBenchmarkDataset(num_samples=240, img_size=(64, 64))
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    model = RemoteSensingAdapterHead().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)

    start_time = time.time()
    best_acc = 0.0

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        train_acc = correct / total if total > 0 else 0
        avg_loss = total_loss / total if total > 0 else 0

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, preds = torch.max(outputs, 1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        val_acc = val_correct / val_total if val_total > 0 else 0
        print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {avg_loss:.4f} | Train Acc: {train_acc * 100:.1f}% | Val Acc: {val_acc * 100:.1f}%")

        if val_acc >= best_acc:
            best_acc = val_acc

    # Save adapted checkpoint
    chk_dir = Path(__file__).resolve().parent.parent.parent / "models" / "checkpoints"
    chk_dir.mkdir(parents=True, exist_ok=True)
    chk_path = chk_dir / "adapted_rs_head.pt"
    torch.save(model.state_dict(), chk_path)

    # Save training metadata
    meta = {
        "model_architecture": "RemoteSensingAdapterHead",
        "benchmark_dataset": "EuroSAT LULC",
        "classes": EUROSAT_CLASSES,
        "epochs": epochs,
        "final_val_accuracy": round(best_acc * 100, 2),
        "device": str(device),
        "checkpoint_path": str(chk_path),
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(chk_dir / "adaptation_metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    elapsed = time.time() - start_time
    print(f"\nTraining successfully concluded in {elapsed:.2f}s.")
    print(f"Checkpoint saved to: {chk_path}")
    print(f"Best Validation Accuracy: {best_acc * 100:.2f}%")
    return meta


if __name__ == "__main__":
    train_adaptation_pipeline()
