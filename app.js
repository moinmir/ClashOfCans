document.addEventListener('DOMContentLoaded', () => {
  let turns = 0;
  let correct = 0;
  
  const turnsCounter = document.getElementById('turnsCounter');
  const correctCounter = document.getElementById('correctCounter');
  const checkButton = document.getElementById('checkButton');
  const cans = document.querySelectorAll('.can');
  
  // When the check button is pressed, update counters
  checkButton.addEventListener('click', () => {
    turns++;
    
    // Sample logic: if at least one can is moved (its transform is not empty), count it as correct.
    let anyDragged = false;
    cans.forEach(can => {
      if (can.style.transform && can.style.transform !== 'none') {
        anyDragged = true;
      }
    });
    if (anyDragged) {
      correct++;
    }
    
    // Update the display counters
    turnsCounter.textContent = `Turns: ${turns}`;
    correctCounter.textContent = `Correct: ${correct}`;
  });
  
  // For smooth dragging, add pointer events to all cans
  cans.forEach(can => {
    // Disable default touch actions to allow custom dragging on mobile
    can.style.touchAction = 'none';

    can.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const targetCan = e.currentTarget;
      const startX = e.clientX;
      
      // Capture pointer events for smoother drag behavior
      targetCan.setPointerCapture(e.pointerId);
      
      const pointerMoveHandler = (e) => {
        const dx = e.clientX - startX;
        
        // Move the picked-up can
        targetCan.style.transform = `translateX(${dx}px)`;
        
        // Move the other cans in the opposite direction for a noticeable animation
        cans.forEach(otherCan => {
          if (otherCan !== targetCan) {
            otherCan.style.transform = `translateX(${-dx}px)`;
          }
        });
      };
      
      const pointerUpHandler = (e) => {
        // After drop, reset transforms (the CSS transition makes it smooth)
        targetCan.style.transform = '';
        cans.forEach(otherCan => {
          if (otherCan !== targetCan) {
            otherCan.style.transform = '';
          }
        });
        
        // Clean up event listeners
        targetCan.releasePointerCapture(e.pointerId);
        targetCan.removeEventListener('pointermove', pointerMoveHandler);
        targetCan.removeEventListener('pointerup', pointerUpHandler);
      };
      
      targetCan.addEventListener('pointermove', pointerMoveHandler);
      targetCan.addEventListener('pointerup', pointerUpHandler);
    });
  });
}); 