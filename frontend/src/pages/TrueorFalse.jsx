import ObjectivePracticePage from '../components/ObjectivePracticePage'

const TrueorFalse = () => (
  <ObjectivePracticePage
    objectiveType="true-or-false"
    title="True or False"
    subtitle="Read each statement carefully and choose the correct truth value."
    defaultOptions={['True', 'False']}
  />
)

export default TrueorFalse
