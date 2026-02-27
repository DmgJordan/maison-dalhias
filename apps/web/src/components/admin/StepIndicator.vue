<script setup lang="ts">
interface StepDef {
  label: string;
}

interface Props {
  steps: StepDef[];
  currentStep: number;
  completedSteps?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  completedSteps: undefined,
});

function isCompleted(index: number): boolean {
  if (props.completedSteps) {
    return props.completedSteps.includes(index + 1);
  }
  return index + 1 < props.currentStep;
}

function isActive(index: number): boolean {
  return index + 1 === props.currentStep;
}
</script>

<template>
  <div class="progress-bar">
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="progress-step"
      :class="{
        'progress-step--active': isActive(index),
        'progress-step--completed': isCompleted(index),
      }"
    >
      <div class="step-circle">
        <svg
          v-if="isCompleted(index)"
          xmlns="http://www.w3.org/2000/svg"
          class="check-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span v-else>{{ index + 1 }}</span>
      </div>
      <span class="step-label">{{ step.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.progress-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 8px;
  overflow-x: auto;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  background-color: #e5e5e5;
  color: #717171;
  transition: all 0.2s;
}

.progress-step--active .step-circle {
  background-color: #ff385c;
  color: white;
}

.progress-step--completed .step-circle {
  background-color: #10b981;
  color: white;
}

.check-icon {
  width: 16px;
  height: 16px;
}

.step-label {
  font-size: 11px;
  color: #717171;
  text-align: center;
  max-width: 60px;
}

.progress-step--active .step-label {
  color: #ff385c;
  font-weight: 600;
}

.progress-step--completed .step-label {
  color: #10b981;
}

@media (min-width: 768px) {
  .progress-bar {
    background-color: white;
    border-radius: 12px;
    padding: 16px 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e5e5;
    margin-bottom: 24px;
  }

  .progress-step {
    position: relative;
  }

  /* Connecting lines between steps */
  .progress-step::after {
    content: '';
    position: absolute;
    top: 16px;
    left: calc(50% + 20px);
    width: calc(100% - 40px);
    height: 2px;
    background-color: #e5e5e5;
  }

  .progress-step:last-child::after {
    display: none;
  }

  .progress-step--completed::after {
    background-color: #10b981;
  }

  .step-circle {
    width: 36px;
    height: 36px;
    font-size: 15px;
    position: relative;
    z-index: 1;
  }

  .step-label {
    font-size: 12px;
    max-width: 80px;
  }
}

@media (min-width: 1024px) {
  .step-circle {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .step-label {
    font-size: 13px;
  }
}
</style>
