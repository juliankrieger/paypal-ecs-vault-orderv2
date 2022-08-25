export function getValueInput() {
    const valueInput = document.getElementById("amount-input").value;
    return valueInput ?? "80";
}